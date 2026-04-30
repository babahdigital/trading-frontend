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
import { applyAffiliateLinks } from '@/lib/blog/affiliate-links';
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

const COMMON_TAIL = `

REQUIREMENT OUTPUT:
- Tulis dalam Bahasa Indonesia profesional, institutional tone.
- Markdown: heading ## (min 3), bullet points, tabel kalau perbandingan.
- Struktur WAJIB: 1 paragraf hook → 3-5 ## section → 1 list "Key Takeaway" → 1 baris disclaimer.
- Panjang: 800-1500 kata.
- JANGAN fabrikasi data — hanya gunakan DATA_JSON. Kalau data sparse, artikel pendek lebih baik daripada padding.
- Akhiri dengan: "Konten edukasi — bukan saran investasi. Trading forex melibatkan risiko kehilangan modal."

DATA INJECTED:
{{DATA_JSON}}

Return ONLY markdown body, tanpa preamble, tanpa code fence.`;

const dayConfigs: Record<number, DayConfig> = {
  1: {
    type: 'recap',
    category: 'MARKET_ANALYSIS',
    imageSlugHint: 'weekly-market-recap-candlestick-chart-multi-pair',
    fetchData: async () => {
      try {
        const res = await proxyToMasterBackend('research', '/api/research/weekly-recap', { method: 'GET' });
        if (!res.ok) return null;
        return await res.json() as Record<string, unknown>;
      } catch { return null; }
    },
    buildPrompt: async (data) => ({
      titleId: `Rangkuman Pasar Mingguan — ${formatDateId(new Date())}`,
      titleEn: `Weekly Market Recap — ${formatDateEn(new Date())}`,
      keywords: ['weekly recap', 'forex market', 'top signals', 'win rate', 'institutional analysis'],
      prompt: `Kamu adalah quant analyst BabahAlgo. Tulis "Weekly Market Recap" untuk minggu ini, ringkas top signals, market overview, key observations, risk notes — dari data weekly-recap berikut.${COMMON_TAIL}`.replace('{{DATA_JSON}}', JSON.stringify(data, null, 2)),
    }),
  },
  2: {
    type: 'ai_lesson',
    category: 'EDUCATION',
    imageSlugHint: 'ai-lesson-of-the-day-trading-algorithm-learning',
    fetchData: async () => {
      try {
        const res = await proxyToMasterBackend('research', '/api/research/top-signals?limit=5', { method: 'GET' });
        if (!res.ok) return null;
        return await res.json() as Record<string, unknown>;
      } catch { return null; }
    },
    buildPrompt: async (data) => ({
      titleId: `AI Lesson of the Day — ${formatDateId(new Date())}`,
      titleEn: `AI Lesson of the Day — ${formatDateEn(new Date())}`,
      keywords: ['ai trading', 'algorithm lesson', 'trading insight', 'institutional ai'],
      prompt: `Kamu adalah AI trading educator. Pilih SATU pola atau insight dari data top-signals berikut, dan jelaskan ke trader retail dengan analogi yang mudah dipahami. Format: hook → konsep utama → contoh dari data → cara apply → takeaway.${COMMON_TAIL}`.replace('{{DATA_JSON}}', JSON.stringify(data, null, 2)),
    }),
  },
  3: {
    type: 'case_study',
    category: 'CASE_STUDY',
    imageSlugHint: 'trade-case-study-candlestick-entry-exit-markers',
    fetchData: async () => {
      try {
        const res = await proxyToMasterBackend('research', '/api/research/top-signals?limit=3', { method: 'GET' });
        if (!res.ok) return null;
        return await res.json() as Record<string, unknown>;
      } catch { return null; }
    },
    buildPrompt: async (data) => ({
      titleId: `Studi Kasus Trade — ${formatDateId(new Date())}`,
      titleEn: `Trade Case Study — ${formatDateEn(new Date())}`,
      keywords: ['trade case study', 'high confidence signal', 'forex analysis', 'institutional execution'],
      prompt: `Kamu adalah trader analyst BabahAlgo. Pilih satu trade dari data top-signals, narasikan dari sudut pandang bot: market context → entry rationale → execution → outcome → lesson. Sertakan tabel singkat metrics (entry, SL, TP, confidence, outcome).${COMMON_TAIL}`.replace('{{DATA_JSON}}', JSON.stringify(data, null, 2)),
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
      titleId: `Analisis Korelasi & Sesi — ${formatDateId(new Date())}`,
      titleEn: `Correlation & Session Analysis — ${formatDateEn(new Date())}`,
      keywords: ['correlation analysis', 'forex session', 'pair correlation', 'institutional risk'],
      prompt: `Kamu adalah portfolio risk analyst. Berdasarkan recent pair briefs di DATA_JSON, identifikasi cluster korelasi pair, sesi trading dominan, dan implikasi risk management untuk trader retail. Sertakan tabel pair-bias dan rekomendasi position sizing.${COMMON_TAIL}`.replace('{{DATA_JSON}}', JSON.stringify(data, null, 2)),
    }),
  },
  5: {
    type: 'risk',
    category: 'RISK',
    imageSlugHint: 'risk-management-drawdown-protective-bars',
    fetchData: async () => null, // Conceptual, no specific data
    buildPrompt: async () => ({
      titleId: `Insight Risk Management — ${formatDateId(new Date())}`,
      titleEn: `Risk Management Insight — ${formatDateEn(new Date())}`,
      keywords: ['risk management', 'kelly criterion', 'position sizing', 'drawdown protection'],
      prompt: `Kamu adalah risk specialist BabahAlgo. Tulis insight risk management harian — pilih satu konsep (vol-scalar sizing, correlation guard, daily loss cap, breakeven discipline, atau time decay exit) dan elaborasi dengan contoh konkret. Sertakan formula atau heuristik aktual.${COMMON_TAIL}`.replace('{{DATA_JSON}}', '{}'),
    }),
  },
  6: {
    type: 'strategy',
    category: 'STRATEGY',
    imageSlugHint: 'trading-strategy-deep-dive-annotated-chart',
    fetchData: async () => null,
    buildPrompt: async () => {
      const strategies = ['SMC Order Block', 'Wyckoff Spring', 'Fibonacci Confluence', 'ATR Breakout', 'Quasimodo Pattern', 'Liquidity Sweep'];
      const pick = strategies[new Date().getDate() % strategies.length];
      return {
        titleId: `Strategi: ${pick} — Panduan Mendalam`,
        titleEn: `Strategy: ${pick} — Deep Dive`,
        keywords: [pick.toLowerCase(), 'trading strategy', 'institutional pattern', 'forex setup'],
        prompt: `Kamu adalah technical analyst senior. Tulis deep-dive ${pick}: identifikasi visual, kondisi entry, validasi konfirmasi, common mistakes retail, dan integrasi dengan multi-timeframe context.${COMMON_TAIL}`.replace('{{DATA_JSON}}', '{}'),
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
      titleId: `Preview Pekan Depan — ${formatDateId(new Date())}`,
      titleEn: `Week Ahead Preview — ${formatDateEn(new Date())}`,
      keywords: ['week ahead', 'economic calendar', 'forex preview', 'NFP', 'FOMC', 'CPI'],
      prompt: `Kamu adalah macro analyst. Berdasarkan economic calendar data, identifikasi event high-impact pekan depan dan implikasi positioning. Sertakan tabel event-impact-pair.${COMMON_TAIL}`.replace('{{DATA_JSON}}', JSON.stringify(data, null, 2)),
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

    // Post-process: affiliate links + internal cross-references
    body = await applyAffiliateLinks(body);
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
