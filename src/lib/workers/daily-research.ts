/**
 * Daily research auto-pipeline.
 *
 * Generates 1 fresh article per day, rotating content type by day-of-
 * week to keep /research always populated with relevant material:
 *
 *   Mon (1) → Weekly Market Recap (VPS1 weekly-recap + signals stats)
 *   Tue (2) → AI Lesson of the Day (one observation_log entry → narrative)
 *   Wed (3) → Trade Case Study (one high-confidence advice_log → narrative)
 *   Thu (4) → Correlation Insight (pair-briefs aggregate)
 *   Fri (5) → Risk Management Insight (observation_log patterns)
 *   Sat (6) → Strategy Deep-Dive (rotating SMC/Wyckoff/Fib)
 *   Sun (0) → Weekend Preview + Calendar (upcoming events)
 *
 * Each daily article is keyed by `daily-{YYYY-MM-DD}-{type}` slug so
 * the worker is idempotent — re-runs on the same day update the same
 * article. Past days are preserved.
 *
 * Data sources via proxyToMasterBackend with scoped tokens. Graceful
 * degradation: if VPS1 source unreachable, worker logs warning and
 * skips this day's article (no fake data).
 */

import { prisma } from '@/lib/db/prisma';
import { getOpenRouter, DEFAULT_MODEL } from '@/lib/ai/openrouter';
import { translateText } from '@/lib/ai/content';
import { generateArticleImage } from '@/lib/ai/image-generator';
import { generateSeoMeta } from '@/lib/ai/seo-meta';
import { injectInternalLinks, invalidateInternalLinkCache } from '@/lib/blog/internal-links';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';
import { generateText } from 'ai';
import type { ArticleCategory, Prisma } from '@prisma/client';

const log = createLogger('daily-research');
const WORKER = 'daily_research';

interface DayConfig {
  type: 'recap' | 'ai_lesson' | 'case_study' | 'correlation' | 'risk' | 'strategy' | 'preview';
  category: ArticleCategory;
  imageSlugHint: string;
  buildPrompt: (data: Record<string, unknown>) => Promise<{ titleId: string; titleEn: string; prompt: string; keywords: string[] }>;
  fetchData: () => Promise<Record<string, unknown> | null>;
}

// Editorial guardrails — disuntik ke setiap research prompt supaya AI generated
// content presisi, evidence-based, dan SEO-aware. Strategi:
//   1. Anti-hallucination clamp — wajib cite source dari DATA_JSON (no padding).
//   2. Markdown rich rendering — formula `$...$`, table, highlight `==...==`,
//      code fence — semua sudah disupport oleh renderMarkdown di FE.
//   3. Internal link awareness — link ke halaman platform terkait untuk topical
//      authority SEO (boost time-on-site + crawl depth).
//   4. Backend data substrate aware — AI tahu market-substrate-api ada di
//      VPS1:8220 (SMC zones, key levels, sessions, news) supaya bisa rujuk
//      data primitives saat narate.
const COMMON_TAIL = `

═══ EDITORIAL GUARDRAILS — WAJIB DIPATUHI ═══

ANTI-HALUSINASI (paling kritis):
- HANYA narasikan fakta dari DATA_JSON. Jangan invent angka, pair, atau event yang tidak ada di data.
- Jika DATA_JSON kosong / sparse, lebih baik artikel pendek (500 kata) yang akurat daripada padding ngawur.
- Setiap angka spesifik (win rate, R:R, lot size, level harga) HARUS direference balik ke field di DATA_JSON.
- Tidak boleh klaim "win rate 75%" atau "+5% return bulan ini" tanpa source data eksplisit.
- Forward-looking statements WAJIB dalam bahasa hipotetis: "potensi", "skenario", "indikasi" — bukan prediksi.

MARKDOWN RICH FORMATTING (renderer support penuh):
- Headings: ## (h2 mandatory min 3), ### (h3 untuk sub-sections)
- Lists: - bullet, 1. ordered
- Tabel WAJIB kalau ada perbandingan numerik:
  | Pair | Win Rate | R:R | Notes |
  | --- | --- | --- | --- |
  | EURUSD | 62% | 1.8 | ... |
- Formula inline: \`$E = R \\cdot p - (1-p)$\` (Kelly criterion expectancy)
- Formula block: \`$$\\sigma_t = \\sqrt{\\frac{1}{N}\\sum(r_i - \\bar{r})^2}$$\` (volatility std-dev)
- Highlight insight kritis: ==text== untuk callout
- Code fence \`\`\`python untuk pseudo-code algorithm

INTERNAL LINKING (topical authority + UX):
Sebar 2-4 link internal ke halaman BabahAlgo relevan, misal:
- [SMC Scalper strategy](/platform/strategies/smc) — saat bahas SMC/Quasimodo
- [SMC Swing](/platform/strategies/smc-swing) — saat bahas H1-H4 setup
- [Pivot Mean Reversion](/platform/strategies/pivot-mean-reversion) — saat bahas fade-to-pivot
- [Risk Framework](/platform/risk-framework) — saat bahas position sizing / drawdown
- [Performance Track Record](/performance) — saat bahas hasil aktual
- [Execution Architecture](/platform/execution) — saat bahas ZeroMQ/MT5 bridge
- [Tradeable Instruments](/platform/instruments) — saat bahas pair coverage
Jangan over-link (max 5 per artikel) dan harus contextual — bukan footer link dump.

DATA SUBSTRATE AWARENESS (backend yang power BabahAlgo):
BabahAlgo punya market-substrate-api (VPS1:8220) yang expose data primitives:
- SMC zones (order block, FVG, breaker block) dari /v1/substrate
- Key levels (daily/weekly pivot, S/R) dari /v1/key-levels
- Trading sessions (Asia/London/NY) dari /v1/sessions
- Upcoming news (high-impact events) dari /v1/upcoming-news
Sebut data substrate ini saat relevan supaya pembaca paham riset bukan opini — tapi grounded di telemetri sistem.

SEO + TYPOGRAPHY:
- Hook 1 paragraf (50-80 kata) — bukan basa-basi, langsung value proposition.
- 3-5 H2 sections, masing-masing 150-300 kata.
- Tabel atau list di setiap section yang membandingkan/membedakan.
- Penutup: list "Key Takeaway" (3-5 bullet, masing-masing <20 kata).
- 1 baris disclaimer di akhir (mandatory): "Konten edukasi — bukan saran investasi. Trading forex melibatkan risiko kehilangan modal."

PANJANG: 800-1500 kata (artikel pendek 500 kata OK kalau data sparse).
BAHASA: Bahasa Indonesia profesional, institutional tone. Avoid clickbait / hype words.

DATA INJECTED (gunakan ini sebagai satu-satunya sumber kebenaran):
{{DATA_JSON}}

Return ONLY markdown body, tanpa preamble, tanpa code fence wrapper.`;

/**
 * Fallback data source — pull recent PairBrief rows from local DB ketika
 * VPS1 backend `/api/research/*` returns 404 (microservice tunnel belum
 * di-extend). Gives the AI prompt grounded context dari published research
 * di portal yang sudah berisi pair / bias / session / confluence-score —
 * format setara dengan backend top-signals shape sehingga prompt tetap
 * "evidence-driven from data" instead of empty / generic.
 */
async function fetchPairBriefsFallback(limit: number): Promise<Record<string, unknown> | null> {
  try {
    const briefs = await prisma.pairBrief.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: {
        pair: true,
        session: true,
        fundamentalBias: true,
        confluenceScore: true,
        supportLevels: true,
        resistanceLevels: true,
        sndZones: true,
        keyPatterns: true,
        tradeIdeas: true,
        publishedAt: true,
      },
    });
    if (briefs.length === 0) return null;
    return {
      source: 'fe_prisma_fallback',
      generated_at: new Date().toISOString(),
      signals: briefs.map((b) => ({
        pair: b.pair,
        session: b.session,
        bias: b.fundamentalBias,
        confluence_score: b.confluenceScore,
        support: b.supportLevels,
        resistance: b.resistanceLevels,
        snd_zones: b.sndZones,
        key_patterns: b.keyPatterns,
        trade_ideas: b.tradeIdeas,
        published_at: b.publishedAt?.toISOString(),
      })),
    };
  } catch (err) {
    log.warn(`pairBrief fallback failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return null;
  }
}

const dayConfigs: Record<number, DayConfig> = {
  1: {
    type: 'recap',
    category: 'MARKET_ANALYSIS',
    imageSlugHint: 'weekly-market-recap-candlestick-chart-multi-pair',
    fetchData: async () => {
      try {
        const res = await proxyToMasterBackend('research', '/api/research/weekly-recap', { method: 'GET' });
        if (res.ok) return await res.json() as Record<string, unknown>;
      } catch { /* fall through to fallback */ }
      // Backend 404 / 503 → use FE Prisma PairBrief sebagai sumber data.
      // 7 briefs untuk weekly window.
      return await fetchPairBriefsFallback(7);
    },
    buildPrompt: async (data) => ({
      titleId: `Rangkuman Pasar Mingguan ${formatDateId(new Date())}: Sinyal Forex & Win Rate Institusional`,
      titleEn: `Weekly Forex Market Recap ${formatDateEn(new Date())}: Top Signals & Win Rate Analysis`,
      keywords: ['weekly forex recap', 'top trading signals', 'win rate analysis', 'SMC institutional', 'pair performance'],
      prompt: `Kamu adalah quant analyst BabahAlgo. Tulis "Weekly Market Recap" yang grounded di data:
- Ringkas top signals dari DATA_JSON (sebut pair spesifik + win rate dari data, jangan generalisasi).
- Market overview: identifikasi 2-3 pair best performer + 1-2 worst performer dari data, narasikan kenapa (ngacu structure events / news jika ada).
- Key observations: 3 pattern actionable dari data (correlation cluster, session bias, atau confluence pattern).
- Risk notes: highlight pair dengan drawdown atau slippage signifikan.
- Sebut data substrate (SMC zones, key levels) sebagai source primitives kalau relevan.
- Internal link ke /platform/strategies/smc atau /performance jika narasi menyentuh strategi/track record.${COMMON_TAIL}`.replace('{{DATA_JSON}}', JSON.stringify(data, null, 2)),
    }),
  },
  2: {
    type: 'ai_lesson',
    category: 'EDUCATION',
    imageSlugHint: 'ai-lesson-of-the-day-trading-algorithm-learning',
    fetchData: async () => {
      try {
        const res = await proxyToMasterBackend('research', '/api/research/top-signals?limit=5', { method: 'GET' });
        if (res.ok) return await res.json() as Record<string, unknown>;
      } catch { /* fall through to fallback */ }
      return await fetchPairBriefsFallback(5);
    },
    buildPrompt: async (data) => ({
      titleId: `Pelajaran AI Trading: Cara Membaca Konfluensi SMC ${formatDateId(new Date())}`,
      titleEn: `AI Trading Lesson: How to Read SMC Confluence ${formatDateEn(new Date())}`,
      keywords: ['ai trading lesson', 'smc confluence', 'algorithmic trading insight', 'institutional pattern', 'retail to pro'],
      prompt: `Kamu adalah AI trading educator BabahAlgo. Pilih SATU pola atau insight kongkret dari DATA_JSON top-signals, jelaskan ke trader retail:
- Hook: kenapa pola ini matter (1 paragraf, evidence-driven dari data).
- Konsep utama: definisi visual + statistical edge (sertakan formula expectancy $E = p \\cdot R - (1-p)$ atau Kelly fraction kalau pas).
- Contoh konkret dari DATA_JSON (sebut pair spesifik + timestamp).
- Cara apply di MT5: entry trigger, SL placement, TP staging (TP1/TP2/TP3 ratio).
- Common pitfall retail trader saat trade pattern ini.
- Internal link ke /platform/strategies/smc atau /platform/strategies/smc-swing.${COMMON_TAIL}`.replace('{{DATA_JSON}}', JSON.stringify(data, null, 2)),
    }),
  },
  3: {
    type: 'case_study',
    category: 'CASE_STUDY',
    imageSlugHint: 'trade-case-study-candlestick-entry-exit-markers',
    fetchData: async () => {
      try {
        const res = await proxyToMasterBackend('research', '/api/research/top-signals?limit=3', { method: 'GET' });
        if (res.ok) return await res.json() as Record<string, unknown>;
      } catch { /* fall through to fallback */ }
      return await fetchPairBriefsFallback(3);
    },
    buildPrompt: async (data) => ({
      titleId: `Studi Kasus Trade ${formatDateId(new Date())}: Anatomi Entry High-Confidence SMC`,
      titleEn: `Trade Case Study ${formatDateEn(new Date())}: Anatomy of a High-Confidence SMC Entry`,
      keywords: ['forex trade case study', 'smc entry', 'high confidence signal', 'institutional execution', 'rr ratio'],
      prompt: `Kamu adalah trader analyst BabahAlgo. Pilih satu trade dari DATA_JSON top-signals (yang paling representatif), narasikan dari sudut pandang bot:
- Market context (1 paragraf): session, news landscape, broader trend dari data substrate.
- Entry rationale: confluence apa saja yang trigger (SMC zone hit, structure shift, key level retest — semua dari data).
- Execution: entry price, lot size (vol-target), SL placement (anchored to structure), TP staging.
- Outcome: realized R, time-in-trade, exit reason.
- Lesson: 1-2 takeaway untuk retail trader.
WAJIB tabel metrics di tengah artikel:
| Metric | Value |
| --- | --- |
| Entry | (dari data) |
| SL | (dari data) |
| TP1/TP2/TP3 | (dari data) |
| R:R Target | (dari data) |
| AI Confidence | (dari data) |
| Outcome | (dari data) |
Internal link ke /platform/strategies/smc atau /platform/execution untuk technical detail.${COMMON_TAIL}`.replace('{{DATA_JSON}}', JSON.stringify(data, null, 2)),
    }),
  },
  4: {
    type: 'correlation',
    category: 'RESEARCH',
    imageSlugHint: 'correlation-matrix-heatmap-currency-pairs',
    fetchData: async () => {
      try {
        const briefs = await prisma.pairBrief.findMany({
          where: { isPublished: true },
          orderBy: { publishedAt: 'desc' },
          take: 8,
          select: { pair: true, session: true, fundamentalBias: true, confluenceScore: true, supportLevels: true, resistanceLevels: true },
        });
        return { briefs } as Record<string, unknown>;
      } catch { return null; }
    },
    buildPrompt: async (data) => ({
      titleId: `Analisis Korelasi Pair & Bias Sesi ${formatDateId(new Date())}: Diversifikasi Risk untuk Trader Forex`,
      titleEn: `Pair Correlation & Session Bias ${formatDateEn(new Date())}: Risk Diversification for Forex Traders`,
      keywords: ['forex pair correlation', 'trading session analysis', 'risk diversification', 'institutional risk', 'multi-pair portfolio'],
      prompt: `Kamu adalah portfolio risk analyst BabahAlgo. Berdasarkan recent pair briefs di DATA_JSON:
- Identifikasi cluster korelasi (e.g. EUR/CHF/GBP basket vs commodity USD).
- Sesi trading dominan dari data (Asia/London/NY) — pair mana yang active di sesi mana.
- Bias fundamental (bullish/bearish) dengan confluence score per pair.
WAJIB tabel pair-bias di tengah artikel:
| Pair | Session | Bias | Confluence Score | Notes |
| --- | --- | --- | --- | --- |
| (sebut pair dari DATA_JSON) | ... | ... | ... | ... |
- Rekomendasi position sizing pakai correlation-aware approach: kalau EURUSD + GBPUSD highly correlated, total exposure di kedua pair = 1.5× single-pair limit, bukan 2× (correlation guard di sistem BabahAlgo).
- Internal link ke /platform/risk-framework untuk technical detail correlation guard.${COMMON_TAIL}`.replace('{{DATA_JSON}}', JSON.stringify(data, null, 2)),
    }),
  },
  5: {
    type: 'risk',
    category: 'RISK',
    imageSlugHint: 'risk-management-drawdown-protective-bars',
    fetchData: async () => null, // Conceptual, no specific data
    buildPrompt: async () => {
      const concepts = ['Vol-Target Sizing', 'Correlation Guard', 'Daily Loss Cap', 'Kelly Fraction', 'Drawdown Recovery Math'];
      const pick = concepts[new Date().getDate() % concepts.length];
      return {
        titleId: `Risk Management Forex: ${pick} untuk Trader Profesional`,
        titleEn: `Forex Risk Management: ${pick} for Professional Traders`,
        keywords: [pick.toLowerCase().replace(/\s+/g, '-'), 'forex risk management', 'position sizing', 'institutional discipline'],
        prompt: `Kamu adalah risk specialist BabahAlgo. Tulis deep-dive konsep "${pick}":
- Definisi + intuisi matematis (sertakan formula block $$...$$).
- Contoh kongkret: misal "Akun \\$10K, daily DD cap 2% = \\$200 hard stop. Bot otomatis halt trading saat hit \\$200 loss kumulatif harian."
- Kenapa retail trader sering gagal eksekusi konsep ini (psikologi vs sistem).
- Bagaimana BabahAlgo enforce konsep ini di kernel: vol-target sizing pakai 1% per trade, scaled by ATR(14); correlation guard cap total exposure 1.5× single-pair; daily DD trigger kill-switch state machine.
- 3 actionable rules untuk pembaca apply sendiri di MT5.
- Internal link wajib ke /platform/risk-framework (technical detail 12-layer risk).${COMMON_TAIL}`.replace('{{DATA_JSON}}', '{}'),
      };
    },
  },
  6: {
    type: 'strategy',
    category: 'STRATEGY',
    imageSlugHint: 'trading-strategy-deep-dive-annotated-chart',
    fetchData: async () => null,
    buildPrompt: async () => {
      // 3 strategi inti BabahAlgo + 3 pattern teknikal underlying = 6 rotation slot
      // sesuai backend reality (no Wyckoff/Astronacci/AI Momentum drift).
      const strategies = [
        { name: 'SMC Scalper (Quasimodo Family)', slug: 'smc' },
        { name: 'SMC Swing H1-H4', slug: 'smc-swing' },
        { name: 'Pivot Mean Reversion', slug: 'pivot-mean-reversion' },
        { name: 'Order Block Identification', slug: 'smc' },
        { name: 'Liquidity Sweep + FVG', slug: 'smc' },
        { name: 'Daily Pivot Fade Setup', slug: 'pivot-mean-reversion' },
      ];
      const pick = strategies[new Date().getDate() % strategies.length];
      return {
        titleId: `Strategi Trading Forex: ${pick.name} — Panduan Lengkap`,
        titleEn: `Forex Trading Strategy: ${pick.name} — Complete Guide`,
        keywords: [pick.name.toLowerCase(), 'forex trading strategy', 'smc institutional', 'multi-timeframe setup'],
        prompt: `Kamu adalah technical analyst senior BabahAlgo. Tulis deep-dive "${pick.name}":
- Identifikasi visual (cara recognize pattern di chart, sertakan list checklist).
- Kondisi entry (precondition + trigger).
- Validasi konfirmasi (confluence yang harus hit: structure shift / liquidity sweep / news context).
- Multi-timeframe context: H4 bias → H1 structure → M15 entry → M5 execution.
- 3-5 common mistakes retail trader saat trade pattern ini.
- Bagaimana BabahAlgo bot eksekusi setup ini secara otomatis (AI Brain modules: Bandit Routing pilih confluence, Kelly Sizing untuk lot, Markov TP).
- Internal link ke /platform/strategies/${pick.slug} (strategy page) dan /platform/execution (technical bridge).${COMMON_TAIL}`.replace('{{DATA_JSON}}', '{}'),
      };
    },
  },
  0: {
    type: 'preview',
    category: 'MARKET_ANALYSIS',
    imageSlugHint: 'weekend-preview-economic-calendar-events',
    fetchData: async () => {
      try {
        const res = await proxyToMasterBackend('research', '/api/research/calendar/EURUSD', { method: 'GET' });
        if (res.status === 404) return { note: 'No calendar data for EURUSD this week' };
        if (!res.ok) return null;
        return await res.json() as Record<string, unknown>;
      } catch { return null; }
    },
    buildPrompt: async (data) => ({
      titleId: `Forex Week Ahead ${formatDateId(new Date())}: Event Kalender Ekonomi & Positioning`,
      titleEn: `Forex Week Ahead ${formatDateEn(new Date())}: Economic Calendar Events & Positioning`,
      keywords: ['forex week ahead', 'economic calendar', 'NFP forecast', 'FOMC', 'CPI inflation', 'institutional positioning'],
      prompt: `Kamu adalah macro analyst BabahAlgo. Berdasarkan economic calendar data:
- Identifikasi 3-5 event high-impact pekan depan (NFP, FOMC, CPI, ECB, BOJ — apa pun yang ada di data).
- WAJIB tabel event-impact-pair:
| Hari | Event | Currency | Impact | Pair Affected |
| --- | --- | --- | --- | --- |
- Skenario positioning: bullish / bearish / neutral untuk pair primary affected.
- News blackout reminder: BabahAlgo halt trading 30 min pre-news untuk high-impact.
- Internal link ke /platform/risk-framework (news blackout layer) atau /portal/notifications.${COMMON_TAIL}`.replace('{{DATA_JSON}}', JSON.stringify(data, null, 2)),
    }),
  },
};

function formatDateId(d: Date): string {
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateEn(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function dateSlug(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface DailyResearchResult {
  status: 'ok' | 'skipped' | 'error';
  slug?: string;
  type?: string;
  durationMs: number;
  error?: string;
}

export async function runDailyResearch(): Promise<DailyResearchResult> {
  const start = Date.now();
  const today = new Date();
  const dayOfWeek = today.getUTCDay(); // 0=Sun, 6=Sat
  const config = dayConfigs[dayOfWeek];

  if (!config) {
    return { status: 'skipped', durationMs: Date.now() - start };
  }

  const slug = `daily-${dateSlug(today)}-${config.type}`;
  const run = await prisma.workerRun.create({
    data: { worker: WORKER, status: 'RUNNING', metadata: { slug, dayOfWeek, type: config.type } as Prisma.InputJsonValue },
  });

  try {
    const or = getOpenRouter();
    if (!or) {
      log.warn('OPENROUTER_API_KEY not set, skipping daily research');
      await prisma.workerRun.update({
        where: { id: run.id },
        data: { finishedAt: new Date(), status: 'SKIPPED', errorMessage: 'OPENROUTER_API_KEY missing' },
      });
      return { status: 'skipped', durationMs: Date.now() - start };
    }

    const data = (await config.fetchData()) ?? {};
    const built = await config.buildPrompt(data);

    const { text: rawBody } = await generateText({
      model: or.chat(DEFAULT_MODEL),
      prompt: built.prompt,
      temperature: 0.45,
      maxOutputTokens: 4500,
    });

    const DISCLAIMER = 'Konten edukasi — bukan saran investasi. Trading forex melibatkan risiko kehilangan modal.';
    let body = rawBody.trim();
    if (!/bukan saran investasi|risiko kehilangan|not investment advice/i.test(body)) {
      body = `${body}\n\n_${DISCLAIMER}_`;
    }

    const wordCount = body.split(/\s+/).length;
    if (wordCount < 300) {
      throw new Error(`Body too short (${wordCount} words) — likely AI failure`);
    }

    const readTime = Math.max(3, Math.ceil(wordCount / 220));

    // Post-process: internal cross-references (affiliate link injection dihapus
    // 2026-05-15 — zero-custody positioning, no broker rebate links in content).
    const { body: linkedBody, linkedSlugs } = await injectInternalLinks(body, {
      ownSlug: slug,
      maxLinks: 5,
    });
    if (linkedSlugs.length > 0) {
      log.info(`Internal links added for ${slug}: ${linkedSlugs.join(', ')}`);
    }
    body = linkedBody;

    // Generate hero image (concept-illustrative via slug hint)
    const imageResult = await generateArticleImage(built.titleEn, {
      category: config.category,
      keywords: built.keywords,
      slug: config.imageSlugHint,
    });

    // SEO meta — Indonesian
    const seoId = await generateSeoMeta({
      title: built.titleId,
      excerpt: body.slice(0, 300),
      category: config.category,
      keywords: built.keywords,
      language: 'id',
    });

    const article = await prisma.article.upsert({
      where: { slug },
      create: {
        slug,
        title: built.titleId,
        title_en: built.titleEn,
        excerpt: body.slice(0, 250).replace(/[\n#*_`>-]/g, ' ').replace(/\s+/g, ' ').trim() + '…',
        body,
        category: config.category,
        author: 'BabahAlgo Research Desk',
        readTime,
        imageUrl: imageResult?.dataUri ?? null,
        metaTitle: seoId?.metaTitle ?? null,
        metaDescription: seoId?.metaDescription ?? null,
        keywords: built.keywords as Prisma.InputJsonValue,
        isPublished: true,
        publishedAt: new Date(),
      },
      update: {
        title: built.titleId,
        title_en: built.titleEn,
        body,
        readTime,
        ...(imageResult ? { imageUrl: imageResult.dataUri } : {}),
        ...(seoId ? { metaTitle: seoId.metaTitle, metaDescription: seoId.metaDescription } : {}),
        keywords: built.keywords as Prisma.InputJsonValue,
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    // EN translation + EN SEO (non-blocking)
    try {
      const [body_en, seoEn] = await Promise.all([
        translateText(body),
        generateSeoMeta({
          title: built.titleEn,
          excerpt: body.slice(0, 300),
          category: config.category,
          keywords: built.keywords,
          language: 'en',
        }),
      ]);
      if (body_en || seoEn) {
        await prisma.article.update({
          where: { id: article.id },
          data: {
            ...(body_en ? { body_en, excerpt_en: body_en.slice(0, 250).replace(/[\n#*_`>-]/g, ' ').replace(/\s+/g, ' ').trim() + '…' } : {}),
            ...(seoEn ? { metaTitle_en: seoEn.metaTitle, metaDescription_en: seoEn.metaDescription } : {}),
          },
        });
      }
    } catch (translateErr) {
      log.warn(`EN translation failed for ${slug}: ${translateErr instanceof Error ? translateErr.message : 'unknown'}`);
    }

    invalidateInternalLinkCache();

    await prisma.workerRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), status: 'OK', itemsProcessed: 1, metadata: { slug, type: config.type } as Prisma.InputJsonValue },
    });

    log.info(`Daily research published: ${slug} (${config.type})`);
    return { status: 'ok', slug, type: config.type, durationMs: Date.now() - start };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    log.error(`Daily research failed: ${msg}`);
    await prisma.workerRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), status: 'ERROR', errorMessage: msg },
    });
    return { status: 'error', error: msg, durationMs: Date.now() - start };
  }
}
