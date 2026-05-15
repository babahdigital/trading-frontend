export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/public/strategy-stats');

/**
 * Public strategy stats — aggregate WR/RR/avgHold per public strategy slug.
 *
 * Konsumen utama: `/platform/strategies` + `/platform/strategies/[slug]` —
 * supaya angka WR/RR ditampilkan dari backtest journal real (bukan hardcode).
 *
 * Sumber data backend: `GET /v1/strategy-stats` (port 8211 signals-api,
 * Phase 14V follow-up). Saat backend belum ship endpoint, return `null`
 * stat — frontend render placeholder `—` + label "publikasi Q3 2026".
 *
 * Schema response:
 *   {
 *     source: 'backend' | 'pending',
 *     stats: {
 *       [slug]: {
 *         winRate: number;        // 0..1
 *         avgRR: number;          // e.g. 1.8
 *         avgHoldMinutes: number; // e.g. 105
 *         maxConsecutiveLoss: number;
 *         sampleSize: number;     // trade count
 *         lastUpdated: string;    // ISO8601
 *       } | null
 *     }
 *   }
 *
 * Slug mapping (FE umbrella → backend strategy_id):
 *   smc                  → scalper.qm_perfect_pure / _ao / _adx / _full / _adx_h4
 *   smc-swing            → swing.qm_perfect_*
 *   pivot-mean-reversion → scalper.pivot_mean_reversion
 *
 * Backend yang aggregate per-umbrella belum live. Sampai itu ship, endpoint
 * return source='pending' + semua slug null supaya UI tahu data belum tersedia.
 */

export type StrategyStat = {
  winRate: number | null;
  avgRR: number | null;
  avgHoldMinutes: number | null;
  maxConsecutiveLoss: number | null;
  sampleSize: number | null;
  lastUpdated: string | null;
};

const SLUGS = ['smc', 'smc-swing', 'pivot-mean-reversion'] as const;

function emptyStats(): Record<string, StrategyStat | null> {
  const out: Record<string, StrategyStat | null> = {};
  for (const s of SLUGS) out[s] = null;
  return out;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { ts: number; payload: unknown } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json(cache.payload, {
      headers: { 'Cache-Control': 'public, max-age=300' },
    });
  }

  try {
    const res = await proxyToMasterBackend('signals', '/v1/strategy-stats', { method: 'GET' });
    if (res.ok) {
      const body = await res.json();
      if (body && typeof body === 'object' && body.stats) {
        const payload = { source: 'backend' as const, stats: body.stats };
        cache = { ts: Date.now(), payload };
        return NextResponse.json(payload, {
          headers: { 'Cache-Control': 'public, max-age=300' },
        });
      }
    }
    // Backend belum ship endpoint — degrade gracefully (404/501)
    if (res.status !== 404 && res.status !== 501) {
      log.warn(`strategy-stats backend HTTP ${res.status}`);
    }
  } catch (err) {
    log.warn(`strategy-stats backend error: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  const payload = { source: 'pending' as const, stats: emptyStats() };
  cache = { ts: Date.now(), payload };
  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
}
