export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/public/strategy-stats');

/**
 * Public strategy stats — aggregate WR/RR/avgHold per umbrella.
 *
 * Backend: signals-api port 8211 (separate ASGI service di trading-forex
 * container). Live per Phase 14V Wave 2.5 TASK 94 (2026-05-15).
 *
 * Auth: X-Api-Key (server-only, scope SIGNALS_READ) — JANGAN expose ke browser.
 *
 * Backend response shape:
 *   {
 *     umbrellas: [
 *       { umbrella: 'smc', trades, wins, win_rate, net_pnl_usd, avg_rr,
 *         avg_hold_minutes, window_days },
 *       { umbrella: 'smc-swing', ... },
 *       { umbrella: 'pivot-mean-reversion', ... }
 *     ],
 *     window_days: 30,
 *     computed_at: ISO8601
 *   }
 *
 * FE consumer di `/platform/strategies` membaca via `lib/trading/strategy-stats.ts`.
 *
 * Env required:
 *   SIGNALS_API_URL    — base URL signals-api (default: http://localhost:8211)
 *   SIGNALS_API_KEY    — X-Api-Key dengan scope SIGNALS_READ (admin-provisioned)
 */

interface BackendUmbrella {
  umbrella: 'smc' | 'smc-swing' | 'pivot-mean-reversion';
  trades: number;
  wins: number;
  win_rate: number; // 0..1
  net_pnl_usd: number;
  avg_rr: number | null;
  avg_hold_minutes: number | null;
  max_consecutive_loss: number | null;
  window_days: number;
}

interface BackendResponse {
  umbrellas: BackendUmbrella[];
  window_days: number;
  computed_at: string;
}

export interface StrategyStat {
  winRate: number | null;
  avgRR: number | null;
  avgHoldMinutes: number | null;
  maxConsecutiveLoss: number | null;
  sampleSize: number | null;
  lastUpdated: string | null;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { ts: number; payload: unknown } | null = null;

function emptyStats(): Record<string, StrategyStat | null> {
  return {
    smc: null,
    'smc-swing': null,
    'pivot-mean-reversion': null,
  };
}

export async function GET(request: Request) {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json(cache.payload, {
      headers: { 'Cache-Control': 'public, max-age=300' },
    });
  }

  const url = new URL(request.url);
  const windowDays = url.searchParams.get('window_days') || '30';

  const baseUrl = process.env.SIGNALS_API_URL || 'http://localhost:8211';
  const apiKey = process.env.SIGNALS_API_KEY;

  if (!apiKey) {
    // No key configured — return empty placeholder (FE pakai sebagai gating UI)
    const payload = { source: 'pending' as const, stats: emptyStats() };
    cache = { ts: Date.now(), payload };
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  }

  try {
    const res = await fetch(`${baseUrl}/v1/strategy-stats?window_days=${windowDays}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey,
        'User-Agent': 'vps3-commercial/1.0',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) {
      const body = (await res.json()) as BackendResponse;
      if (body && Array.isArray(body.umbrellas)) {
        const stats: Record<string, StrategyStat | null> = emptyStats();
        for (const row of body.umbrellas) {
          stats[row.umbrella] = {
            winRate: row.trades > 0 ? row.win_rate : null,
            avgRR: row.avg_rr,
            avgHoldMinutes: row.avg_hold_minutes,
            maxConsecutiveLoss: row.max_consecutive_loss ?? null,
            sampleSize: row.trades,
            lastUpdated: body.computed_at,
          };
        }
        const payload = { source: 'backend' as const, stats, window_days: body.window_days };
        cache = { ts: Date.now(), payload };
        return NextResponse.json(payload, {
          headers: { 'Cache-Control': 'public, max-age=300' },
        });
      }
    }
    if (res.status !== 404 && res.status !== 503) {
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
