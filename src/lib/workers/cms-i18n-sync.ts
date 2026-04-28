/**
 * Zero-touch CMS i18n auto-sync worker.
 *
 * Runs periodically (cron interval, default 5min) and:
 *   1. Finds CMS rows where EN translation is missing or stale
 *      (updatedAt > en_synced_at) across Faq, PricingTier,
 *      LandingSection, Article.
 *   2. For each stale row, calls OpenRouter (Gemini 2.5 Flash Lite) to
 *      translate Indonesian source → English columns.
 *   3. Writes back *_en columns + sets en_synced_at = NOW().
 *
 * Key properties:
 *   - Idempotent: re-running on a freshly-translated row is a no-op
 *     (en_synced_at >= updatedAt).
 *   - Adaptive: when admin edits the Indonesian text, updatedAt advances
 *     and worker auto-retranslates on next tick.
 *   - Batched + rate-limited: max BATCH_SIZE rows per run to avoid
 *     long-running cron tasks; Gemini Flash Lite is cheap so cost is
 *     negligible (~$0.075/1M tokens).
 *   - Fail-safe: per-row try/catch, error logged but doesn't halt batch.
 *
 * Auto-enabled when OPENROUTER_API_KEY is set. Force-disable with
 * ENABLE_CMS_I18N_AUTO="0".
 */

import { generateText } from 'ai';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getOpenRouter, DEFAULT_MODEL } from '@/lib/ai/openrouter';
import { createLogger } from '@/lib/logger';

const log = createLogger('cms-i18n-sync');

// Per-tick safety cap. Gemini Flash Lite handles batches fast (~2-4s/row
// for short text, ~5-10s for article body). 20 rows × 4 tables = 80 max
// per tick worst case, but typical steady-state is 0-2 stale rows.
const BATCH_SIZE = 20;

const SYSTEM_PROMPT = `You are translating a fintech/trading platform CMS from Indonesian to English.

Rules:
1. Translate VALUES only — preserve placeholder tokens like {name}, {amount}, {seconds}, /portal/...
2. Maintain a professional, institutional tone (Bloomberg, Goldman Sachs UI copy — concise, confident, no marketing fluff).
3. Brand names stay: BabahAlgo, CV Babah Digital, Robot Meta, Robot Crypto, MetaTrader 5, MT5, Binance, Exness.
4. Technical terms stay English: VPS, KYC, AUM, FAQ, API, SMC, Wyckoff, Astronacci, Fibonacci, Spot, Futures, scalping_momentum, ATR, NFP, FOMC, ZeroMQ.
5. Currency stays as-is ($49/mo, USDT, $500).
6. Keep formatting: paragraph breaks, bullet markers (- or •), code spans (\`text\`).
7. Output ONLY the translated text — no explanations, no quotes, no JSON wrapping unless input was JSON.`;

async function translateText(text: string): Promise<string> {
  const or = getOpenRouter();
  if (!or) throw new Error('OPENROUTER_API_KEY not configured');
  const { text: result } = await generateText({
    model: or(DEFAULT_MODEL),
    system: SYSTEM_PROMPT,
    prompt: `Translate this Indonesian text to English. Output ONLY the translation.\n\nInput: ${text}`,
    temperature: 0.2,
  });
  let en = result.trim();
  if ((en.startsWith('"') && en.endsWith('"')) || (en.startsWith("'") && en.endsWith("'"))) {
    en = en.slice(1, -1);
  }
  return en;
}

async function translateJson(value: unknown): Promise<unknown> {
  const or = getOpenRouter();
  if (!or) throw new Error('OPENROUTER_API_KEY not configured');
  const { text: result } = await generateText({
    model: or(DEFAULT_MODEL),
    system: SYSTEM_PROMPT,
    prompt: `Translate the values in this JSON from Indonesian to English. Keep keys unchanged. Only return valid JSON, no markdown fence.\n\n${JSON.stringify(value, null, 2)}`,
    temperature: 0.2,
  });
  try {
    const cleaned = result.replace(/^```json?\n?/g, '').replace(/\n?```$/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return value; // fail-safe: return original on parse error
  }
}

async function translateStringArray(arr: string[]): Promise<string[]> {
  // Translate each string independently; preserves order.
  const results: string[] = [];
  for (const s of arr) {
    if (!s || s.trim().length === 0) {
      results.push(s);
      continue;
    }
    results.push(await translateText(s));
  }
  return results;
}

/**
 * Pick stale rows: en_synced_at IS NULL (never synced) OR
 *                  updatedAt > en_synced_at (Indonesian edited after last sync).
 * Order by updatedAt ASC so freshly-edited rows get priority.
 */
async function syncFaq(): Promise<{ ok: number; failed: number }> {
  const candidates = await prisma.faq.findMany({
    where: {
      OR: [
        { en_synced_at: null },
        { en_synced_at: { lt: prisma.faq.fields.updatedAt } },
      ],
    },
    orderBy: { updatedAt: 'asc' },
    take: BATCH_SIZE,
  });

  let ok = 0;
  let failed = 0;
  for (const f of candidates) {
    try {
      const [qEn, aEn] = await Promise.all([
        translateText(f.question),
        translateText(f.answer),
      ]);
      await prisma.faq.update({
        where: { id: f.id },
        data: { question_en: qEn, answer_en: aEn, en_synced_at: new Date() },
      });
      ok++;
    } catch (err) {
      failed++;
      log.error(`FAQ ${f.id} translate failed: ${String(err).slice(0, 200)}`);
    }
  }
  return { ok, failed };
}

async function syncPricingTier(): Promise<{ ok: number; failed: number }> {
  const candidates = await prisma.pricingTier.findMany({
    where: {
      OR: [
        { en_synced_at: null },
        { en_synced_at: { lt: prisma.pricingTier.fields.updatedAt } },
      ],
    },
    orderBy: { updatedAt: 'asc' },
    take: BATCH_SIZE,
  });

  let ok = 0;
  let failed = 0;
  for (const t of candidates) {
    try {
      const featuresArr = Array.isArray(t.features) ? (t.features as unknown as string[]) : [];
      const [name_en, subtitle_en, ctaLabel_en, features_en] = await Promise.all([
        translateText(t.name),
        t.subtitle ? translateText(t.subtitle) : Promise.resolve<string | null>(null),
        translateText(t.ctaLabel),
        featuresArr.length > 0 ? translateStringArray(featuresArr) : Promise.resolve<string[]>([]),
      ]);
      await prisma.pricingTier.update({
        where: { id: t.id },
        data: {
          name_en,
          subtitle_en,
          ctaLabel_en,
          features_en: features_en.length > 0 ? (features_en as Prisma.InputJsonValue) : Prisma.JsonNull,
          en_synced_at: new Date(),
        },
      });
      ok++;
    } catch (err) {
      failed++;
      log.error(`PricingTier ${t.id} translate failed: ${String(err).slice(0, 200)}`);
    }
  }
  return { ok, failed };
}

async function syncLandingSection(): Promise<{ ok: number; failed: number }> {
  const candidates = await prisma.landingSection.findMany({
    where: {
      OR: [
        { en_synced_at: null },
        { en_synced_at: { lt: prisma.landingSection.fields.updatedAt } },
      ],
    },
    orderBy: { updatedAt: 'asc' },
    take: BATCH_SIZE,
  });

  let ok = 0;
  let failed = 0;
  for (const s of candidates) {
    try {
      const [title_en, subtitle_en, content_en] = await Promise.all([
        translateText(s.title),
        s.subtitle ? translateText(s.subtitle) : Promise.resolve<string | null>(null),
        s.content ? translateJson(s.content) : Promise.resolve<unknown>(null),
      ]);
      await prisma.landingSection.update({
        where: { id: s.id },
        data: {
          title_en,
          subtitle_en,
          content_en: (content_en as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          en_synced_at: new Date(),
        },
      });
      ok++;
    } catch (err) {
      failed++;
      log.error(`LandingSection ${s.id} translate failed: ${String(err).slice(0, 200)}`);
    }
  }
  return { ok, failed };
}

async function syncArticle(): Promise<{ ok: number; failed: number }> {
  const candidates = await prisma.article.findMany({
    where: {
      OR: [
        { en_synced_at: null },
        { en_synced_at: { lt: prisma.article.fields.updatedAt } },
      ],
    },
    orderBy: { updatedAt: 'asc' },
    // Articles have long body — smaller batch size to avoid hot loop on big content.
    take: Math.max(1, Math.floor(BATCH_SIZE / 4)),
  });

  let ok = 0;
  let failed = 0;
  for (const a of candidates) {
    try {
      const [title_en, excerpt_en, body_en, metaTitle_en, metaDescription_en] = await Promise.all([
        translateText(a.title),
        translateText(a.excerpt),
        translateText(a.body),
        a.metaTitle ? translateText(a.metaTitle) : Promise.resolve<string | null>(null),
        a.metaDescription ? translateText(a.metaDescription) : Promise.resolve<string | null>(null),
      ]);
      await prisma.article.update({
        where: { id: a.id },
        data: {
          title_en,
          excerpt_en,
          body_en,
          metaTitle_en,
          metaDescription_en,
          en_synced_at: new Date(),
        },
      });
      ok++;
    } catch (err) {
      failed++;
      log.error(`Article ${a.id} translate failed: ${String(err).slice(0, 200)}`);
    }
  }
  return { ok, failed };
}

async function syncPageMeta(): Promise<{ ok: number; failed: number }> {
  const candidates = await prisma.pageMeta.findMany({
    where: {
      OR: [
        { en_synced_at: null },
        { en_synced_at: { lt: prisma.pageMeta.fields.updatedAt } },
      ],
    },
    orderBy: { updatedAt: 'asc' },
    take: BATCH_SIZE,
  });

  let ok = 0;
  let failed = 0;
  for (const m of candidates) {
    try {
      const [title_en, description_en, ogTitle_en, ogDescription_en] = await Promise.all([
        translateText(m.title),
        m.description ? translateText(m.description) : Promise.resolve<string | null>(null),
        m.ogTitle ? translateText(m.ogTitle) : Promise.resolve<string | null>(null),
        m.ogDescription ? translateText(m.ogDescription) : Promise.resolve<string | null>(null),
      ]);
      await prisma.pageMeta.update({
        where: { id: m.id },
        data: {
          title_en,
          description_en,
          ogTitle_en,
          ogDescription_en,
          en_synced_at: new Date(),
        },
      });
      ok++;
    } catch (err) {
      failed++;
      log.error(`PageMeta ${m.id} (${m.path}) translate failed: ${String(err).slice(0, 200)}`);
    }
  }
  return { ok, failed };
}

export async function runCmsI18nSync(): Promise<void> {
  if (!process.env.OPENROUTER_API_KEY) {
    return;
  }

  const start = Date.now();
  const [faq, tier, section, article, pageMeta] = await Promise.all([
    syncFaq().catch((err) => { log.error('FAQ sync error:', err); return { ok: 0, failed: 0 }; }),
    syncPricingTier().catch((err) => { log.error('PricingTier sync error:', err); return { ok: 0, failed: 0 }; }),
    syncLandingSection().catch((err) => { log.error('LandingSection sync error:', err); return { ok: 0, failed: 0 }; }),
    syncArticle().catch((err) => { log.error('Article sync error:', err); return { ok: 0, failed: 0 }; }),
    syncPageMeta().catch((err) => { log.error('PageMeta sync error:', err); return { ok: 0, failed: 0 }; }),
  ]);

  const total = faq.ok + tier.ok + section.ok + article.ok + pageMeta.ok;
  const totalFailed = faq.failed + tier.failed + section.failed + article.failed + pageMeta.failed;
  const ms = Date.now() - start;

  // Stay quiet on idle ticks; only log when there's actual work or failures.
  if (total > 0 || totalFailed > 0) {
    log.info(
      `CMS i18n sync: faq=${faq.ok}/${faq.failed} pricing=${tier.ok}/${tier.failed} ` +
      `pageMeta=${pageMeta.ok}/${pageMeta.failed} ` +
      `landing=${section.ok}/${section.failed} article=${article.ok}/${article.failed} ` +
      `total=${total} failed=${totalFailed} ms=${ms}`
    );
  }
}
