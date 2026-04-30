/**
 * Blog Article Generator Worker.
 *
 * Zero-touch AI-powered article generation from BlogTopic catalog:
 *
 *   1. Query active topics ready for generation (status PENDING/FAILED,
 *      scheduledWeek <= currentWeek).
 *   2. For each topic:
 *      - Fetch data sources (VPS1 endpoints, DB queries, static).
 *      - Build prompt from promptTemplate with {{DATA_JSON}} / {{TARGET_WORDS}}.
 *      - Generate markdown via OpenRouter (gemini-2.5-flash-lite default).
 *      - Validate output (length, structure, disclaimer).
 *      - Upsert Article with body + excerpt.
 *      - Auto-translate to EN (non-blocking — Article stays published in ID).
 *      - Link BlogTopic.articleId + set status PUBLISHED (or GENERATED if
 *        autoPublish=false).
 *   3. Record WorkerRun + AiCallLog for observability.
 *
 * Admin can override by triggering with `topicSlug` (regenerate specific
 * topic) or `force` (re-run even PUBLISHED topics).
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
import { TOPIC_CATALOG, topicSpecToPrismaCreate } from '@/lib/blog/topic-catalog';
import { generateText } from 'ai';
import type { BlogTopic, Prisma } from '@prisma/client';

const log = createLogger('blog-article-generator');
const WORKER = 'blog_article_generator';

/** Source launch week — adjust to ISO week of go-live. Used to determine which topics are scheduled. */
const LAUNCH_EPOCH_ISO_WEEK = ((): { year: number; week: number } => {
  const raw = process.env.BLOG_LAUNCH_EPOCH_ISO_WEEK;
  if (raw && /^\d{4}-W\d{1,2}$/.test(raw)) {
    const [y, w] = raw.split('-W');
    return { year: parseInt(y, 10), week: parseInt(w, 10) };
  }
  // Default: current ISO week when process starts (falls back sanely)
  const now = new Date();
  return { year: now.getUTCFullYear(), week: getIsoWeek(now) };
})();

function getIsoWeek(d: Date): number {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / (7 * 24 * 3600 * 1000));
}

function currentScheduleWeek(): number {
  const now = new Date();
  const year = now.getUTCFullYear();
  const week = getIsoWeek(now);
  const weeksSinceEpoch = (year - LAUNCH_EPOCH_ISO_WEEK.year) * 52 + (week - LAUNCH_EPOCH_ISO_WEEK.week);
  return Math.max(1, weeksSinceEpoch + 1);
}

export interface BlogGenOptions {
  topicSlug?: string;
  force?: boolean;
  maxTopicsPerRun?: number;
}

export interface BlogGenResult {
  status: 'ok' | 'skipped' | 'error';
  processed: number;
  succeeded: number;
  failed: number;
  topics: Array<{ slug: string; status: string; error?: string; articleId?: string }>;
  durationMs: number;
}

interface DataSourceSpec {
  type: 'vps1_endpoint' | 'db_query' | 'static';
  path?: string;
  scope?: 'signals' | 'research' | 'pamm' | 'stats' | 'scanner';
  model?: 'pricingTier' | 'signalAuditLog' | 'pairBrief';
  value?: unknown;
}

export async function runBlogArticleGenerator(options: BlogGenOptions = {}): Promise<BlogGenResult> {
  const start = Date.now();
  const result: BlogGenResult = {
    status: 'ok',
    processed: 0,
    succeeded: 0,
    failed: 0,
    topics: [],
    durationMs: 0,
  };

  const run = await prisma.workerRun.create({
    data: { worker: WORKER, status: 'RUNNING' },
  });

  try {
    const or = getOpenRouter();
    if (!or) {
      log.warn('OPENROUTER_API_KEY not configured — blog generator idle');
      await prisma.workerRun.update({
        where: { id: run.id },
        data: {
          finishedAt: new Date(),
          status: 'SKIPPED',
          errorMessage: 'OPENROUTER_API_KEY missing',
        },
      });
      return { ...result, status: 'skipped', durationMs: Date.now() - start };
    }

    // Self-healing: auto-seed the catalog if BlogTopic table is empty.
    // Removes the need for admin to manually curl /api/cron/seed-blog-topics.
    const existingCount = await prisma.blogTopic.count();
    if (existingCount === 0 && !options.topicSlug) {
      log.info(`BlogTopic table empty — auto-seeding ${TOPIC_CATALOG.length} topics from catalog`);
      for (const spec of TOPIC_CATALOG) {
        try {
          await prisma.blogTopic.create({ data: topicSpecToPrismaCreate(spec) });
        } catch (err) {
          log.warn(`Auto-seed failed for ${spec.slug}: ${err instanceof Error ? err.message : 'unknown'}`);
        }
      }
    }

    const currentWeek = currentScheduleWeek();
    const where: Prisma.BlogTopicWhereInput = options.topicSlug
      ? { slug: options.topicSlug }
      : options.force
        ? { isActive: true }
        : {
            isActive: true,
            status: { in: ['PENDING', 'FAILED'] },
            scheduledWeek: { lte: currentWeek },
          };

    const topics = await prisma.blogTopic.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { scheduledWeek: 'asc' }],
      take: options.maxTopicsPerRun ?? 3,
    });

    if (topics.length === 0) {
      log.info(`No topics to generate (currentWeek=${currentWeek})`);
      await prisma.workerRun.update({
        where: { id: run.id },
        data: { finishedAt: new Date(), status: 'OK', itemsProcessed: 0 },
      });
      return { ...result, status: 'skipped', durationMs: Date.now() - start };
    }

    for (const topic of topics) {
      result.processed += 1;
      try {
        const outcome = await generateOneTopic(topic);
        result.succeeded += 1;
        result.topics.push({ slug: topic.slug, status: 'ok', articleId: outcome.articleId });
      } catch (err) {
        result.failed += 1;
        const msg = err instanceof Error ? err.message : 'unknown';
        log.error(`Topic ${topic.slug} failed: ${msg}`);
        result.topics.push({ slug: topic.slug, status: 'error', error: msg });
        await prisma.blogTopic.update({
          where: { id: topic.id },
          data: { status: 'FAILED', lastError: msg.slice(0, 2000) },
        });
      }
    }

    await prisma.workerRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        status: result.failed > 0 ? 'PARTIAL' : 'OK',
        itemsProcessed: result.succeeded,
        metadata: { processed: result.processed, failed: result.failed } as Prisma.InputJsonValue,
      },
    });
    return { ...result, durationMs: Date.now() - start };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    log.error('Blog generator fatal error:', msg);
    await prisma.workerRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), status: 'ERROR', errorMessage: msg },
    });
    return { ...result, status: 'error', durationMs: Date.now() - start };
  }
}

async function generateOneTopic(topic: BlogTopic): Promise<{ articleId: string }> {
  const or = getOpenRouter();
  if (!or) throw new Error('OpenRouter not configured');

  await prisma.blogTopic.update({
    where: { id: topic.id },
    data: { status: 'GENERATING', lastError: null },
  });

  const dataSources = (topic.dataSources as unknown as DataSourceSpec[]) ?? [];
  const injectedData = await fetchAllDataSources(dataSources);

  const prompt = topic.promptTemplate
    .replace('{{DATA_JSON}}', JSON.stringify(injectedData, null, 2))
    .replaceAll('{{TARGET_WORDS}}', String(topic.targetLengthWords));

  const aiStart = Date.now();
  const { text: markdown, usage } = await generateText({
    model: or.chat(DEFAULT_MODEL),
    prompt,
    temperature: 0.4,
    maxOutputTokens: Math.ceil(topic.targetLengthWords * 3),
  });
  const latencyMs = Date.now() - aiStart;

  const inputTokens = usage?.inputTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? 0;

  await prisma.aiCallLog.create({
    data: {
      purpose: 'blog_article_generate',
      model: DEFAULT_MODEL,
      inputTokens,
      outputTokens,
      latencyMs,
      success: true,
      metadata: { topicSlug: topic.slug } as Prisma.InputJsonValue,
    },
  });

  // Self-heal: auto-append disclaimer if AI omitted it (common failure).
  const DISCLAIMER = 'Konten edukasi — bukan saran investasi. Trading forex melibatkan risiko kehilangan modal.';
  let healed = markdown.trim();
  const hasDisclaimer = /bukan saran investasi|risiko kehilangan|not investment advice/i.test(healed);
  if (!hasDisclaimer) {
    healed = `${healed}\n\n_${DISCLAIMER}_`;
    log.info(`Auto-appended disclaimer for ${topic.slug}`);
  }

  const validation = validateMarkdown(healed, topic);
  if (!validation.ok) {
    throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
  }

  // Post-process: affiliate link injection (Exness etc.) + internal
  // article linking (SEO juice via cross-references). Both functions
  // protect existing markdown links + code blocks from double-wrapping.
  healed = await applyAffiliateLinks(healed);
  const { body: linkedBody, linkedSlugs } = await injectInternalLinks(healed, {
    ownSlug: topic.slug,
    maxLinks: 5,
  });
  if (linkedSlugs.length > 0) {
    log.info(`Internal links added for ${topic.slug}: ${linkedSlugs.join(', ')}`);
  }
  const body = linkedBody;
  const readTime = Math.max(3, Math.ceil(body.split(/\s+/).length / 220));

  // Generate hero image — graceful failure (null imageUrl is fine).
  // Image is concept-illustrative (e.g. Wyckoff phase chart, order
  // block pattern) not decorative. Topic slug unlocks per-topic
  // visualisation subjects in SLUG_SUBJECTS map.
  const keywordsArr = Array.isArray(topic.keywords) ? (topic.keywords as string[]) : [];
  const imageResult = await generateArticleImage(topic.titleEn, {
    category: topic.category,
    keywords: keywordsArr,
    slug: topic.slug,
  });
  if (imageResult) {
    log.info(`Generated hero image for ${topic.slug} (${Math.round(imageResult.sizeBytes / 1024)} KB, ${imageResult.model})`);
  }

  // Generate SEO meta (Indonesian) — graceful failure
  const seoMetaId = await generateSeoMeta({
    title: topic.titleId,
    excerpt: topic.excerptId,
    category: topic.category,
    keywords: keywordsArr,
    language: 'id',
  });

  const article = await prisma.article.upsert({
    where: { slug: topic.slug },
    create: {
      slug: topic.slug,
      title: topic.titleId,
      title_en: topic.titleEn,
      excerpt: topic.excerptId,
      excerpt_en: topic.excerptEn,
      body,
      category: topic.category,
      author: 'BabahAlgo Research Desk',
      readTime,
      imageUrl: imageResult?.dataUri ?? null,
      metaTitle: seoMetaId?.metaTitle ?? null,
      metaDescription: seoMetaId?.metaDescription ?? null,
      keywords: keywordsArr as Prisma.InputJsonValue,
      isPublished: topic.autoPublish,
      publishedAt: topic.autoPublish ? new Date() : null,
    },
    update: {
      title: topic.titleId,
      title_en: topic.titleEn,
      excerpt: topic.excerptId,
      excerpt_en: topic.excerptEn,
      body,
      category: topic.category,
      readTime,
      ...(imageResult ? { imageUrl: imageResult.dataUri } : {}),
      ...(seoMetaId ? { metaTitle: seoMetaId.metaTitle, metaDescription: seoMetaId.metaDescription } : {}),
      keywords: keywordsArr as Prisma.InputJsonValue,
      isPublished: topic.autoPublish,
      publishedAt: topic.autoPublish ? new Date() : null,
    },
  });

  // Auto-translate body to EN + EN SEO meta (non-blocking)
  try {
    const [body_en, seoMetaEn] = await Promise.all([
      translateText(body),
      generateSeoMeta({
        title: topic.titleEn,
        excerpt: topic.excerptEn,
        category: topic.category,
        keywords: keywordsArr,
        language: 'en',
      }),
    ]);
    if (body_en || seoMetaEn) {
      await prisma.article.update({
        where: { id: article.id },
        data: {
          ...(body_en ? { body_en } : {}),
          ...(seoMetaEn ? { metaTitle_en: seoMetaEn.metaTitle, metaDescription_en: seoMetaEn.metaDescription } : {}),
        },
      });
    }
  } catch (translateErr) {
    log.warn(`Translation/SEO failed for ${topic.slug}: ${translateErr instanceof Error ? translateErr.message : 'unknown'}`);
  }

  await prisma.blogTopic.update({
    where: { id: topic.id },
    data: {
      status: topic.autoPublish ? 'PUBLISHED' : 'GENERATED',
      articleId: article.id,
      lastGeneratedAt: new Date(),
      aiModel: DEFAULT_MODEL,
      aiTokensUsed: (topic.aiTokensUsed ?? 0) + inputTokens + outputTokens,
      lastError: null,
    },
  });

  // Invalidate internal-link candidate cache so future articles see
  // this one as a potential cross-reference target.
  invalidateInternalLinkCache();

  log.info(`Generated article ${article.slug} (${inputTokens}+${outputTokens} tokens)`);
  return { articleId: article.id };
}

/**
 * Fetch all data sources in parallel with graceful degradation. A failed
 * source becomes `null` — the prompt instructs AI to use only real data.
 */
async function fetchAllDataSources(sources: DataSourceSpec[]): Promise<Record<string, unknown>> {
  if (sources.length === 0) return {};
  const entries = await Promise.all(
    sources.map(async (src, idx) => {
      try {
        const value = await fetchDataSource(src);
        return [`source_${idx}_${src.type}`, value] as const;
      } catch (err) {
        log.warn(`Data source #${idx} (${src.type}) fetch failed: ${err instanceof Error ? err.message : 'unknown'}`);
        return [`source_${idx}_${src.type}`, null] as const;
      }
    })
  );
  return Object.fromEntries(entries);
}

async function fetchDataSource(src: DataSourceSpec): Promise<unknown> {
  switch (src.type) {
    case 'static':
      return src.value ?? null;

    case 'vps1_endpoint': {
      if (!src.path || !src.scope) return null;
      const res = await proxyToMasterBackend(src.scope, src.path, { method: 'GET' });
      if (!res.ok) return null;
      return res.json();
    }

    case 'db_query': {
      if (src.model === 'pricingTier') {
        return prisma.pricingTier.findMany({
          where: { isVisible: true },
          orderBy: { sortOrder: 'asc' },
          select: { slug: true, name: true, price: true, subtitle: true, features: true, note: true },
        });
      }
      if (src.model === 'signalAuditLog') {
        return prisma.signalAuditLog.findMany({
          orderBy: { emittedAt: 'desc' },
          take: 20,
          select: { pair: true, direction: true, confidence: true, outcome: true, profitUsd: true, emittedAt: true },
        });
      }
      if (src.model === 'pairBrief') {
        return prisma.pairBrief.findMany({
          where: { isPublished: true },
          orderBy: { publishedAt: 'desc' },
          take: 5,
          select: { pair: true, session: true, date: true, confluenceScore: true, fundamentalBias: true },
        });
      }
      return null;
    }

    default:
      return null;
  }
}

interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateMarkdown(markdown: string, topic: BlogTopic): ValidationResult {
  const errors: string[] = [];
  const trimmed = markdown.trim();

  if (!trimmed) {
    return { ok: false, errors: ['empty output'] };
  }

  const wordCount = trimmed.split(/\s+/).length;
  const minWords = Math.floor(topic.targetLengthWords * 0.5);
  const maxWords = Math.ceil(topic.targetLengthWords * 1.8);
  if (wordCount < minWords) errors.push(`too short: ${wordCount} words < ${minWords}`);
  if (wordCount > maxWords) errors.push(`too long: ${wordCount} words > ${maxWords}`);

  const h2Count = (trimmed.match(/^##\s+/gm) ?? []).length;
  if (h2Count < 2) errors.push(`structure weak: only ${h2Count} ## heading(s), expected >= 2`);

  const hasDisclaimer = /bukan saran investasi|risiko kehilangan|not investment advice/i.test(trimmed);
  if (!hasDisclaimer) errors.push('missing required disclaimer line');

  if (/```[\s\S]*markdown/i.test(trimmed.slice(0, 200))) {
    errors.push('output is wrapped in markdown code block (strip requested)');
  }

  return { ok: errors.length === 0, errors };
}
