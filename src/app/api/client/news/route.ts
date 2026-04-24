export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/news');

/**
 * GET /api/client/news — market news feed per FRONTEND_DEVELOPMENT_GUIDE §5.4.
 *
 * Proxies to VPS1 research scope. Returns normalized shape that the
 * NewsWidget consumes. Graceful degradation: returns empty array on
 * upstream failure so widget can show empty state instead of error.
 *
 * Query params:
 *   limit   — default 10, max 50
 *   pair    — filter by trading pair (optional)
 *   impact  — filter by expected impact (low|medium|high)
 */
export async function GET(request: NextRequest) {
  const limitRaw = request.nextUrl.searchParams.get('limit');
  const limit = Math.max(1, Math.min(50, limitRaw ? parseInt(limitRaw, 10) : 10));
  const pair = request.nextUrl.searchParams.get('pair');
  const impact = request.nextUrl.searchParams.get('impact');

  const qs = new URLSearchParams();
  qs.set('limit', String(limit));
  if (pair) qs.set('pair', pair);
  if (impact) qs.set('impact', impact);

  try {
    const res = await proxyToMasterBackend('research', `/v1/news/articles?${qs.toString()}`, { method: 'GET' });
    if (res.ok) {
      const body = await res.json();
      const items = Array.isArray(body?.items) ? body.items : Array.isArray(body) ? body : [];
      return NextResponse.json({
        source: 'backend',
        count: items.length,
        items: items.map(normalizeNewsItem),
      });
    }
    log.warn(`News backend fallback: HTTP ${res.status}`);
  } catch (err) {
    log.warn(`News backend error: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  return NextResponse.json({ source: 'empty', count: 0, items: [] });
}

interface NewsRaw {
  id?: string | number;
  title?: string;
  summary?: string;
  sentiment?: string;
  expected_impact?: string;
  expected_impact_minutes?: number;
  ts_published?: string;
  published_at?: string;
  source?: string;
  url?: string;
  pair?: string;
  tickers?: string[];
}

function normalizeNewsItem(raw: NewsRaw): Record<string, unknown> {
  const sentiment = typeof raw.sentiment === 'string' ? raw.sentiment.toUpperCase() : 'NEUTRAL';
  const impact = typeof raw.expected_impact === 'string' ? raw.expected_impact.toLowerCase() : 'medium';
  return {
    id: raw.id ?? raw.title ?? crypto.randomUUID(),
    title: raw.title ?? '',
    summary: raw.summary ?? '',
    sentiment: ['BULLISH', 'BEARISH', 'NEUTRAL'].includes(sentiment) ? sentiment : 'NEUTRAL',
    expectedImpact: ['low', 'medium', 'high'].includes(impact) ? impact : 'medium',
    expectedImpactMinutes: typeof raw.expected_impact_minutes === 'number' ? raw.expected_impact_minutes : null,
    publishedAt: raw.ts_published ?? raw.published_at ?? new Date().toISOString(),
    source: raw.source ?? 'BabahAlgo Research',
    url: raw.url ?? null,
    tickers: Array.isArray(raw.tickers) ? raw.tickers : raw.pair ? [raw.pair] : [],
  };
}
