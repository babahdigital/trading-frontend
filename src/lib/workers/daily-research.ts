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
import {
  getLatestSignals,
  getNewsArticles,
  getCalendarEvents,
  getAiExplainObservations,
  getAiExplainAdvice,
  getKeyLevels,
  type Vps1NewsArticle,
  type Vps1CalendarEventV1,
  type Vps1AiObservation,
  type Vps1AiAdvice,
  type Vps1Signal,
} from '@/lib/vps1/client';
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

ANTI-RAW-LEAK (jangan publikasikan JSON internal):
- DILARANG menulis nama field JSON apapun ke dalam artikel: \`confluence_score\`, \`bias\`, \`snd_zones\`, \`key_levels\`, \`trade_ideas\`, \`fundamentalBias\`, dll.
  Itu field telemetri internal — pembaca tidak peduli format raw.
- DILARANG menyebut endpoint API: \`/v1/substrate\`, \`/v1/key-levels\`, \`/v1/sessions\`, \`/v1/upcoming-news\`, \`market-substrate-api\`, port 8220 — itu detail infrastruktur backend.
- DILARANG underscore-italic markdown (\`_text_\`); pakai dash atau format normal. Underscore stray (\`_Konten edukasi\`) merusak rendering.
- Numeric scores harus dijelaskan dalam bahasa awam: tulis "skor konfluensi 0.82 dari 1.0 (high-confidence)" BUKAN "confluence_score: 0.82".
- Sebut konsep teknikal (SMC zones, key levels, pivots) sebagai konsep — JANGAN sebagai endpoint atau field.

MARKDOWN MASTERY (renderer support penuh — eksploitasi):
- Headings hierarchical: H1 sudah di-set oleh title; jangan repeat. Pakai
  ## (h2 mandatory min 3, harus action-oriented & keyword-rich) +
  ### (h3 untuk sub-sections, opsional). H4-H6 untuk anatomi mendalam.
- Lists: gunakan - bullet untuk enumerasi paralel; 1. ordered untuk
  step-by-step procedure. JANGAN bullet kalau cuma 1-2 item — paragraph
  lebih natural.
- Tabel WAJIB minimum 1× per artikel kalau ada >2 angka komparatif.
  Format strict:
    | Pair | Win Rate | R:R | Drawdown | Notes |
    | --- | ---: | ---: | ---: | --- |
    | EURUSD | 62% | 1.8 | -4.2% | Trend kuat London |
  Align numeric columns dengan ":---" / "---:" / ":---:".
- Formula matematis pakai KaTeX-compatible LaTeX:
  • Inline: \`$E = R \\cdot p - (1-p)$\` untuk perhitungan singkat.
  • Block: \`$$\\sigma = \\sqrt{\\frac{1}{N}\\sum_{i=1}^{N}(r_i - \\bar{r})^2}$$\`
    untuk derivation / multi-step. Block formula HARUS pada baris sendiri
    dengan \`$$\` di line awal & line akhir terpisah.
- Highlight CRITICAL insight: \`==important phrase==\` untuk callout
  (renderer wraps di <mark>). Pakai maksimal 3× per artikel.
- Code fence untuk pseudo-code algorithmic / config snippet:
  \`\`\`python
  if confluence >= 0.75 and risk_per_trade <= 0.01:
      enter_position(direction, size)
  \`\`\`
- Blockquote untuk source citation atau emphasis: \`> insight quotable...\`
- Bold (\`**text**\`) untuk key terms first appearance; italic (\`*text*\`)
  untuk concept emphasis. JANGAN underscore italic (\`_text_\`) — bisa
  render literal kalau orphan; pakai asterisk.
- Internal anchors: setiap H2 secara otomatis dapat ID by slugify —
  kalau cite section lain: "(lihat bagian Risk Framework di atas)".

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

DATA SUBSTRATE AWARENESS (refer sebagai KONSEP, BUKAN endpoint):
BabahAlgo grounded di telemetri pasar realtime: SMC zones (order block,
FVG, breaker block), key levels (daily/weekly pivot, S/R), trading
sessions (Asia/London/NY), high-impact news calendar. Sebut konsep ini
saat relevan supaya pembaca paham riset bukan opini — TAPI JANGAN
sebut format/endpoint backend (/v1/..., port 8220, api-substrate, dll).

SEO MASTERY (search-engine + human readability):
- Hook 1 paragraf (50-80 kata) — bukan basa-basi, langsung value
  proposition. Sebutkan keyword utama (pair, strategi, atau metric) di
  100 char pertama supaya Google Featured Snippet eligible.
- 3-5 H2 sections, masing-masing 150-300 kata. Setiap H2 harus mengandung
  primary OR secondary keyword (lihat \`built.keywords\`). Hindari H2
  generik "Pendahuluan" / "Kesimpulan" — gunakan keyword-rich.
- 1-2 tabel komparatif di tengah artikel (tabel meningkatkan dwell-time
  dan kemungkinan rich snippet di SERP).
- Semantic HTML implied: pertanyaan retoris → H3 mirror common Google
  "People Also Ask" (e.g. "Bagaimana cara identifikasi SMC zone?").
- LSI keywords: weave related terms tanpa keyword stuffing. Untuk SMC
  artikel: order block, fair value gap, market structure, liquidity grab.
- Internal links 2-4× dengan anchor text descriptive (BUKAN "klik di
  sini") — boost topical authority + crawl depth.
- Penutup wajib "Key Takeaway" list (3-5 bullet, <20 kata each) +
  "Pertanyaan Berikutnya" section dengan 2-3 H3 questions linking ke
  related research (FAQ-like for snippet eligibility).
- 1 baris disclaimer akhir (mandatory; rendered sebagai italic via
  asterisk, BUKAN underscore): "*Konten edukasi — bukan saran investasi.
  Trading forex melibatkan risiko kehilangan modal.*"

TITLE GENERATION (SEO + human-engaging):
- Length 50-65 char (Google SERP truncates >65).
- Format: \`<Topik utama> <Angle/Twist> [opt: tahun atau "Update <bulan>"]\`
  Contoh:
  • "SMC Confluence Stack: 4 Konfirmasi Wajib Sebelum Entry"
  • "Pivot Mean Reversion EURUSD: Win Rate 64% Sesi London (Mei 2026)"
  • "Risk Management Pro: Vol-Target Sizing dengan Kelly Fraction"
- Include 1 keyword utama, 1 specific number/metric, 1 timeframe/sesi
  jika relevan. Hindari clickbait ("WAJIB tahu!", "Rahasia").
- Title yang Anda return DIGUNAKAN langsung sebagai H1 + meta title +
  OG tag — tidak ada post-edit, jadi craft once + perfect.

PANJANG: 800-1500 kata (artikel pendek 500 kata OK kalau data sparse).
BAHASA: Bahasa Indonesia profesional, institutional tone. Avoid clickbait / hype words.

DATA INJECTED (gunakan ini sebagai satu-satunya sumber kebenaran):
{{DATA_JSON}}

Return ONLY markdown body, tanpa preamble, tanpa code fence wrapper.`;

/**
 * Strip raw-JSON / endpoint leakage from generated markdown. Even with
 * the anti-leak prompt rules, AI occasionally writes `confluence_score:
 * 0.82` or `/v1/substrate` verbatim. Public reader doesn't need either
 * — scrub them post-generation so the article reads cleanly without
 * regenerating.
 */
function scrubRawJsonLeak(md: string): string {
  let out = md;
  // 1. snake_case field-name fragments followed by `:` or value
  out = out.replace(/\bconfluence_score\b\s*[:=]?\s*/gi, 'skor konfluensi ');
  out = out.replace(/\bfundamental_?bias\b\s*[:=]?\s*/gi, 'bias fundamental ');
  out = out.replace(/\bsnd_zones\b/gi, 'SMC zones');
  out = out.replace(/\bkey_levels\b/gi, 'key levels');
  out = out.replace(/\btrade_ideas\b/gi, 'ide trading');
  out = out.replace(/\bsupport_levels\b/gi, 'level support');
  out = out.replace(/\bresistance_levels\b/gi, 'level resistance');
  // 2. endpoint paths that should never appear in public content
  out = out.replace(/`?\/v1\/(?:substrate|key-levels|sessions|upcoming-news|signals|news|calendar|indicators|market-data|ai-explain)[^\s`]*`?/g, '');
  out = out.replace(/`?market-substrate-api`?/gi, 'telemetri pasar');
  out = out.replace(/VPS1:[0-9]{4,5}/g, 'backend');
  // 3. stray leading underscore italic at line start ("_Konten edukasi"
  //    without closing underscore — markdown parser renders it literal)
  out = out.replace(/^_(?=\S)/gm, '*');
  out = out.replace(/(?<=\S)_$/gm, '*');
  // 4. collapse double-spaces left by removals
  out = out.replace(/  +/g, ' ').replace(/\n{3,}/g, '\n\n');
  return out;
}

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
      // 2026-05-19 — REAL data: signals/latest + news/articles via microservices
      const [signals, newsRaw] = await Promise.all([
        getLatestSignals({ limit: 30 }).catch((): Vps1Signal[] => []),
        getNewsArticles({ limit: 20 }).catch(() => ({ items: [] as Vps1NewsArticle[] })),
      ]);
      const newsItems = Array.isArray(newsRaw) ? newsRaw : newsRaw.items ?? [];
      if (signals.length === 0 && newsItems.length === 0) {
        // Microservices unreachable → fall back to PairBrief DB.
        return await fetchPairBriefsFallback(7);
      }
      return {
        source: 'microservice_live',
        generated_at: new Date().toISOString(),
        signals_count: signals.length,
        top_signals: signals.slice(0, 10).map((s) => ({
          pair: s.pair,
          direction: s.direction,
          entry_type: s.entry_type,
          entry: s.entry_price ?? s.entry_price_hint,
          sl: s.stop_loss,
          tp: s.take_profit,
          confidence: s.confidence,
          reasoning: s.reasoning?.slice(0, 200),
          emitted_at: s.emitted_at,
        })),
        market_news: newsItems.slice(0, 8).map((n) => ({
          title: n.title,
          source: n.source,
          sentiment: n.sentiment,
          published_at: n.published_at,
        })),
      } as Record<string, unknown>;
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
      // 2026-05-19 — REAL data: AI Explainability observations + recent signals
      const [obsRaw, signals] = await Promise.all([
        getAiExplainObservations({ limit: 10 }).catch(() => ({ items: [] as Vps1AiObservation[] })),
        getLatestSignals({ limit: 5 }).catch((): Vps1Signal[] => []),
      ]);
      const obsItems = Array.isArray(obsRaw) ? obsRaw : obsRaw.items ?? [];
      if (obsItems.length === 0 && signals.length === 0) {
        return await fetchPairBriefsFallback(5);
      }
      return {
        source: 'microservice_live',
        ai_observations: obsItems.slice(0, 5),
        recent_signals: signals.slice(0, 5).map((s) => ({
          pair: s.pair,
          direction: s.direction,
          confidence: s.confidence,
          reasoning: s.reasoning?.slice(0, 200),
        })),
      } as Record<string, unknown>;
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
      // 2026-05-19 — REAL data: high-confidence recent signals + AI advice for context
      const [signals, adviceRaw] = await Promise.all([
        getLatestSignals({ limit: 20, min_confidence: 0.65 }).catch((): Vps1Signal[] => []),
        getAiExplainAdvice({ limit: 5 }).catch(() => ({ items: [] as Vps1AiAdvice[] })),
      ]);
      if (signals.length === 0) {
        return await fetchPairBriefsFallback(3);
      }
      const adviceItems = Array.isArray(adviceRaw) ? adviceRaw : adviceRaw.items ?? [];
      const sortedByConfidence = [...signals].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
      const topPair = sortedByConfidence[0]?.pair;
      // Enrich top signal with key-levels context (substrate microservice).
      const keyLevels = topPair ? await getKeyLevels(topPair).catch(() => null) : null;
      return {
        source: 'microservice_live',
        candidates: sortedByConfidence.slice(0, 3).map((s) => ({
          pair: s.pair,
          direction: s.direction,
          entry_type: s.entry_type,
          entry: s.entry_price ?? s.entry_price_hint,
          sl: s.stop_loss,
          tp: s.take_profit,
          confidence: s.confidence,
          reasoning: s.reasoning?.slice(0, 250),
          lot: s.lot,
          emitted_at: s.emitted_at,
        })),
        ai_rationale: adviceItems.slice(0, 3),
        substrate_context: keyLevels ? {
          symbol: keyLevels.symbol,
          daily_pivot: keyLevels.daily_pivot,
          weekly_pivot: keyLevels.weekly_pivot,
          levels: keyLevels.levels?.slice(0, 5),
        } : null,
      } as Record<string, unknown>;
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
- Bagaimana BabahAlgo bot eksekusi setup ini secara otomatis (deterministic decision engine: rule-based strategy router pilih confluence, Kelly Sizing matematis untuk lot, Markov TP via state transition matrix).
- Internal link ke /platform/strategies/${pick.slug} (strategy page) dan /platform/execution (technical bridge).${COMMON_TAIL}`.replace('{{DATA_JSON}}', '{}'),
      };
    },
  },
  0: {
    type: 'preview',
    category: 'MARKET_ANALYSIS',
    imageSlugHint: 'weekend-preview-economic-calendar-events',
    fetchData: async () => {
      // 2026-05-19 — REAL data: economic calendar events via microservice
      const calRaw = await getCalendarEvents({ limit: 30 }).catch(() => ({ items: [] as Vps1CalendarEventV1[] }));
      const events = Array.isArray(calRaw) ? calRaw : calRaw.items ?? [];
      if (events.length === 0) {
        return { note: 'Calendar microservice returned no upcoming events this week.' };
      }
      // Filter HIGH impact + next 7 days
      const sevenDaysAhead = Date.now() + 7 * 24 * 60 * 60 * 1000;
      const highImpact = events.filter((e) => {
        if (e.impact !== 'HIGH') return false;
        const t = e.time ? Date.parse(e.time) : NaN;
        return Number.isFinite(t) && t <= sevenDaysAhead;
      });
      return {
        source: 'microservice_live',
        week_window: {
          start: new Date().toISOString(),
          end: new Date(sevenDaysAhead).toISOString(),
        },
        total_events: events.length,
        high_impact_count: highImpact.length,
        high_impact_events: highImpact.slice(0, 15).map((e) => ({
          time: e.time,
          currency: e.currency,
          event: e.event,
          impact: e.impact,
          forecast: e.forecast,
          previous: e.previous,
        })),
      } as Record<string, unknown>;
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

    const aiStart = Date.now();
    const { text: rawBody, usage } = await generateText({
      model: or.chat(DEFAULT_MODEL),
      system: 'Kamu adalah analis riset trading profesional global. JANGAN menyebut nama produk/platform/bot. Fokus 100% edukasi trading. Tulis seperti Bloomberg Research. FORMAT: gunakan tabel markdown untuk data, blockquote untuk insight kunci, bold untuk penekanan. DILARANG: LaTeX, ASCII art/flowchart/diagram, underscore italic (_text_), variabel snake_case (win_rate → Win Rate). Rumus tulis sebagai kalimat natural, bukan formula matematika. Paragraf pendek, judul menarik, key takeaway per section.',
      prompt: built.prompt,
      temperature: 0.45,
      maxOutputTokens: 4500,
    });
    await prisma.aiCallLog
      .create({
        data: {
          purpose: 'daily_research_body',
          model: `openrouter/${DEFAULT_MODEL.split('/').pop()}`,
          inputTokens: usage?.inputTokens ?? 0,
          outputTokens: usage?.outputTokens ?? 0,
          latencyMs: Date.now() - aiStart,
          success: true,
          metadata: { category: config.category, slug } as Prisma.InputJsonValue,
        },
      })
      .catch((err) => log.warn(`AiCallLog write failed: ${err instanceof Error ? err.message : 'unknown'}`));

    const DISCLAIMER = 'Konten edukasi — bukan saran investasi. Trading forex melibatkan risiko kehilangan modal.';
    let body = scrubRawJsonLeak(rawBody.trim());
    if (!/bukan saran investasi|risiko kehilangan|not investment advice/i.test(body)) {
      // Plain paragraph (no leading underscore) — markdown italic via _..._
      // pernah render literal kalau penutup di end-of-document tanpa space.
      body = `${body}\n\n*${DISCLAIMER}*`;
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

    // 2026-05-19 — AI hero image generation DISABLED.
    // Pollinations Flux output telah berulang menghasilkan visual yang
    // tidak konsisten dengan institutional brand standard (Pak Abdullah
    // feedback: "gambar masih jelek, matikan saja"). Article rendering
    // graceful-degrades ke gradient + category icon fallback (lihat
    // ArticleCardImage). Aktivasi kembali memerlukan provider yang
    // konsisten (mis. fal.ai Flux Pro berbayar atau in-house SVG
    // template) — sampai itu, set IMAGE_GEN_ENABLED=1 untuk override.
    const imageResult = process.env.IMAGE_GEN_ENABLED === '1'
      ? await generateArticleImage(built.titleEn, {
          category: config.category,
          keywords: built.keywords,
          slug: config.imageSlugHint,
        })
      : null;

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
