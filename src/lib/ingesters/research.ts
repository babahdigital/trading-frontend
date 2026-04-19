import { prisma } from '@/lib/db/prisma';
import { getWeeklyRecap, Vps1Error } from '@/lib/vps1/client';
import { createLogger } from '@/lib/logger';
import { enhanceResearchBody, enhanceAndTranslateArticle } from '@/lib/ai/content';

const log = createLogger('research-ingester');
const WORKER = 'research_ingester';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function buildBasicBody(recap: Awaited<ReturnType<typeof getWeeklyRecap>>): string {
  if (recap.markdown && typeof recap.markdown === 'string') return recap.markdown;
  const lines: string[] = [];
  lines.push(`# Weekly Research Recap`);
  lines.push('');
  lines.push(`**Period:** ${recap.week_start} – ${recap.week_end}`);
  lines.push('');
  lines.push(`**Total signals:** ${recap.total_signals ?? 0}`);
  if (recap.top_pair) lines.push(`**Top pair:** ${recap.top_pair}`);
  if (recap.avg_confidence != null) lines.push(`**Average confidence:** ${Number(recap.avg_confidence).toFixed(2)}`);
  lines.push('');
  if (Array.isArray(recap.highlights) && recap.highlights.length) {
    lines.push(`## Highlights`);
    for (const h of recap.highlights) {
      lines.push(`- **${h.pair}** — ${h.summary}`);
    }
  }
  return lines.join('\n');
}

export interface ResearchIngestResult {
  status: 'ok' | 'error' | 'skipped';
  articleId?: string;
  slug?: string;
  error?: string;
  durationMs: number;
}

export async function runResearchIngester(): Promise<ResearchIngestResult> {
  const start = Date.now();
  const run = await prisma.workerRun.create({
    data: { worker: WORKER, status: 'RUNNING' },
  });

  try {
    const recap = await getWeeklyRecap();
    if (!recap || !recap.week_start) {
      await prisma.workerRun.update({
        where: { id: run.id },
        data: { finishedAt: new Date(), status: 'OK', itemsProcessed: 0 },
      });
      return { status: 'skipped', durationMs: Date.now() - start };
    }

    const slug = `weekly-recap-${slugify(recap.week_start)}`;
    const title = `Weekly Research Recap — ${recap.week_start} to ${recap.week_end}`;
    const excerpt = `Rangkuman ${recap.total_signals ?? 0} sinyal minggu ini${recap.top_pair ? `, top pair ${recap.top_pair}` : ''}.`;

    // Step 1: Build body — use AI enhancement if available, fallback to basic template
    let body = buildBasicBody(recap);
    if (!recap.markdown) {
      try {
        const enhanced = await enhanceResearchBody({
          week_start: recap.week_start,
          week_end: recap.week_end,
          total_signals: recap.total_signals,
          top_pair: recap.top_pair,
          avg_confidence: recap.avg_confidence,
          highlights: recap.highlights,
        });
        if (enhanced) body = enhanced;
      } catch (aiErr) {
        log.warn(`AI body enhancement failed, using basic template: ${aiErr instanceof Error ? aiErr.message : 'unknown'}`);
      }
    }

    // Step 2: Upsert article (Indonesian)
    const article = await prisma.article.upsert({
      where: { slug },
      create: {
        slug,
        title,
        excerpt,
        body,
        category: 'RESEARCH',
        author: 'BabahAlgo Research Desk',
        readTime: Math.max(3, Math.ceil(body.length / 900)),
        isPublished: true,
        publishedAt: new Date(),
      },
      update: {
        title,
        excerpt,
        body,
      },
    });

    // Step 3: AI auto-translate to English (non-blocking — article is already published)
    try {
      const translations = await enhanceAndTranslateArticle({ title, excerpt, body });
      if (translations.title_en) {
        await prisma.article.update({
          where: { id: article.id },
          data: translations,
        });
        log.info(`AI translation completed for: ${slug}`);
      }
    } catch (translateErr) {
      log.warn(`AI translation failed (article published without EN): ${translateErr instanceof Error ? translateErr.message : 'unknown'}`);
    }

    await prisma.workerRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), status: 'OK', itemsProcessed: 1, metadata: { slug } },
    });

    log.info(`Research ingested & published: ${slug}`);
    return { status: 'ok', articleId: article.id, slug, durationMs: Date.now() - start };
  } catch (err) {
    const msg = err instanceof Vps1Error ? `${err.status} ${err.message}` : err instanceof Error ? err.message : 'unknown';
    log.error('Research ingester failed:', msg);
    await prisma.workerRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), status: 'ERROR', errorMessage: msg },
    });
    return { status: 'error', error: msg, durationMs: Date.now() - start };
  }
}
