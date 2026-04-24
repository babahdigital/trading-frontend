export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/bars');

/**
 * GET /api/client/bars — OHLC market data feed per backend-contract
 * MARKET_DATA_CATALOG.
 *
 * Proxies VPS1 /v1/market-data/bars/{symbol}. Normalizes to the shape
 * that <PriceChart /> + lightweight-charts expects:
 *
 *   { time: <unix seconds>, open, high, low, close, volume? }[]
 *
 * Query params:
 *   symbol     — required (e.g. EURUSD, XAUUSD)
 *   timeframe  — M1 | M5 | M15 | M30 | H1 | H4 | D1 (default H1)
 *   limit      — default 200, max 1000
 */

const VALID_TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'] as const;
type Timeframe = (typeof VALID_TIMEFRAMES)[number];

function isTimeframe(v: string): v is Timeframe {
  return (VALID_TIMEFRAMES as readonly string[]).includes(v);
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol');
  const timeframeRaw = request.nextUrl.searchParams.get('timeframe') ?? 'H1';
  const limitRaw = request.nextUrl.searchParams.get('limit');

  if (!symbol) {
    return NextResponse.json({ error: 'symbol query param required' }, { status: 400 });
  }
  if (!isTimeframe(timeframeRaw)) {
    return NextResponse.json({ error: `Invalid timeframe. Expected one of ${VALID_TIMEFRAMES.join(', ')}` }, { status: 400 });
  }
  const limit = Math.max(1, Math.min(1000, limitRaw ? parseInt(limitRaw, 10) : 200));

  const qs = new URLSearchParams({ timeframe: timeframeRaw, limit: String(limit) });

  try {
    const res = await proxyToMasterBackend(
      'research',
      `/v1/market-data/bars/${encodeURIComponent(symbol)}?${qs.toString()}`,
      { method: 'GET' },
    );
    if (res.ok) {
      const body = await res.json();
      const raw = Array.isArray(body?.data) ? body.data : Array.isArray(body?.bars) ? body.bars : Array.isArray(body) ? body : [];
      return NextResponse.json({
        symbol,
        timeframe: timeframeRaw,
        source: 'backend',
        bars: raw.map(normalizeBar).filter((b: ReturnType<typeof normalizeBar> | null): b is Exclude<ReturnType<typeof normalizeBar>, null> => b !== null),
      });
    }
    log.warn(`Bars backend fallback: HTTP ${res.status}`);
  } catch (err) {
    log.warn(`Bars backend error: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  return NextResponse.json({ symbol, timeframe: timeframeRaw, source: 'empty', bars: [] });
}

interface BarRaw {
  time?: number;
  ts_open?: number;
  ts?: number | string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

function normalizeBar(raw: BarRaw): { time: number; open: number; high: number; low: number; close: number; volume?: number } | null {
  let time: number | null = null;
  if (typeof raw.time === 'number') time = raw.time;
  else if (typeof raw.ts_open === 'number') time = raw.ts_open;
  else if (typeof raw.ts === 'number') time = raw.ts;
  else if (typeof raw.ts === 'string') {
    const parsed = Date.parse(raw.ts);
    if (!isNaN(parsed)) time = parsed;
  }

  if (time === null) return null;
  // lightweight-charts expects Unix seconds (not ms)
  const timeSeconds = time > 1e12 ? Math.floor(time / 1000) : Math.floor(time);

  if (typeof raw.open !== 'number' || typeof raw.high !== 'number' || typeof raw.low !== 'number' || typeof raw.close !== 'number') {
    return null;
  }

  return {
    time: timeSeconds,
    open: raw.open,
    high: raw.high,
    low: raw.low,
    close: raw.close,
    ...(typeof raw.volume === 'number' ? { volume: raw.volume } : {}),
  };
}
