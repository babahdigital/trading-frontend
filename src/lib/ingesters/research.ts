import { prisma } from '@/lib/db/prisma';
import { getWeeklyRecap, Vps1Error } from '@/lib/vps1/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('research-ingester');
const WORKER = 'research_ingester';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function buildBody(recap: Awaited<ReturnType<typeof getWeeklyRecap>>): string {
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
    const body = buildBody(recap);
    const excerpt = `Rangkuman ${recap.total_signals ?? 0} sinyal minggu ini${recap.top_pair ? `, top pair ${recap.top_pair}` : ''}.`;

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
        isPublished: false,
      },
      update: {
        title,
        excerpt,
        body,
      },
    });

    await prisma.workerRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), status: 'OK', itemsProcessed: 1, metadata: { slug } },
    });

    log.info(`Research ingested: ${slug} (draft, admin to publish)`);
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
