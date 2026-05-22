/**
 * Public market ticker — aggregate prices dari multiple free sources untuk
 * live ticker bar di top of public pages (Pak Abdullah directive 2026-05-21).
 *
 * Sources:
 *   - Crypto (BTC/ETH/XRP/etc): CoinGecko simple/price API (free, no auth)
 *   - Forex/Commodity (XAU/USOIL/DXY): Yahoo Finance chart API (free, no auth,
 *     UA header required)
 *
 * Resilience (refactor 2026-05-22 — production audit found DNS EAI_AGAIN
 * intermittent + ticker incomplete 20/24):
 *   - In-memory server cache (lastGood) hold successful tickers per symbol
 *   - Stale-while-error: kalau Yahoo DNS fail, return last-known-good
 *   - Per-symbol retry sekali (3s timeout, 1 retry dengan 800ms backoff)
 *   - Aggressive CDN cache (s-maxage 300, swr 900) supaya origin hit jarang
 *
 * Response shape:
 *   { ok, tickers: [...], generatedAt, sources: { live, cached } }
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/public/ticker');

interface Ticker {
  symbol: string;
  label: string;
  group: 'crypto' | 'commodity' | 'forex' | 'index';
  last: number;
  change24hPct: number;
  currency: 'USD' | 'IDR';
}

// Expanded ticker universe — 22 symbols. Indonesia blue-chip stocks (IDR)
// + global commodity/crypto/forex (USD).
const CRYPTO_MAP: Array<{ id: string; symbol: string; label: string }> = [
  { id: 'bitcoin',      symbol: 'BTCUSDT', label: 'BTC' },
  { id: 'ethereum',     symbol: 'ETHUSDT', label: 'ETH' },
  { id: 'ripple',       symbol: 'XRPUSDT', label: 'XRP' },
  { id: 'solana',       symbol: 'SOLUSDT', label: 'SOL' },
  { id: 'binancecoin',  symbol: 'BNBUSDT', label: 'BNB' },
  { id: 'cardano',      symbol: 'ADAUSDT', label: 'ADA' },
  { id: 'dogecoin',     symbol: 'DOGEUSDT', label: 'DOGE' },
  { id: 'avalanche-2',  symbol: 'AVAXUSDT', label: 'AVAX' },
];

const YAHOO_MAP: Array<{ ticker: string; symbol: string; label: string; group: 'commodity' | 'forex' | 'index' }> = [
  // Commodities
  { ticker: 'GC=F',      symbol: 'XAUUSD',  label: 'XAU',     group: 'commodity' },
  { ticker: 'SI=F',      symbol: 'XAGUSD',  label: 'XAG',     group: 'commodity' },
  { ticker: 'CL=F',      symbol: 'USOIL',   label: 'WTI',     group: 'commodity' },
  { ticker: 'NG=F',      symbol: 'NATGAS',  label: 'NATGAS',  group: 'commodity' },
  { ticker: 'HG=F',      symbol: 'COPPER',  label: 'COPPER',  group: 'commodity' },
  // Forex majors
  { ticker: 'EURUSD=X',  symbol: 'EURUSD',  label: 'EUR',    group: 'forex' },
  { ticker: 'GBPUSD=X',  symbol: 'GBPUSD',  label: 'GBP',    group: 'forex' },
  { ticker: 'USDJPY=X',  symbol: 'USDJPY',  label: 'JPY',    group: 'forex' },
  { ticker: 'AUDUSD=X',  symbol: 'AUDUSD',  label: 'AUD',    group: 'forex' },
  { ticker: 'USDCAD=X',  symbol: 'USDCAD',  label: 'CAD',    group: 'forex' },
  { ticker: 'USDCHF=X',  symbol: 'USDCHF',  label: 'CHF',    group: 'forex' },
  { ticker: 'USDIDR=X',  symbol: 'USDIDR',  label: 'IDR',    group: 'forex' },
  { ticker: 'DX=F',      symbol: 'DXY',     label: 'DXY',    group: 'forex' },
  // Index — IHSG + blue chip Indonesia
  { ticker: '^GSPC',     symbol: 'SPX',     label: 'S&P500', group: 'index' },
  { ticker: '^IXIC',     symbol: 'NDX',     label: 'NASDAQ', group: 'index' },
  { ticker: '^JKSE',     symbol: 'IHSG',    label: 'IHSG',   group: 'index' },
  { ticker: 'BBCA.JK',   symbol: 'BBCA',    label: 'BBCA',   group: 'index' },
  { ticker: 'BBRI.JK',   symbol: 'BBRI',    label: 'BBRI',   group: 'index' },
  { ticker: 'TLKM.JK',   symbol: 'TLKM',    label: 'TLKM',   group: 'index' },
  { ticker: 'ASII.JK',   symbol: 'ASII',    label: 'ASII',   group: 'index' },
];

// ─── In-memory stale-while-error cache ──────────────────────────────────
// Per-symbol last-good record. Survive across requests (module-scope).
// Saat Yahoo DNS down 10+ menit, kita TETAP serve last-good values supaya
// ticker bar tidak kehilangan group entirely. Stale entry max 1 jam — beyond
// itu data sudah terlalu basi (drop).
const STALE_MAX_AGE_MS = 60 * 60 * 1000; // 1 jam
interface CacheEntry { ticker: Ticker; ts: number }
const lastGood: Map<string, CacheEntry> = new Map();

function getCached(symbol: string): Ticker | null {
  const entry = lastGood.get(symbol);
  if (!entry) return null;
  if (Date.now() - entry.ts > STALE_MAX_AGE_MS) {
    lastGood.delete(symbol);
    return null;
  }
  return entry.ticker;
}

function putCache(t: Ticker): void {
  lastGood.set(t.symbol, { ticker: t, ts: Date.now() });
}

async function fetchCrypto(): Promise<Ticker[]> {
  try {
    const ids = CRYPTO_MAP.map((c) => c.id).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6_000),
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
    const data = await res.json() as Record<string, { usd?: number; usd_24h_change?: number }>;
    const out: Ticker[] = [];
    for (const c of CRYPTO_MAP) {
      const row = data[c.id];
      if (!row || typeof row.usd !== 'number') {
        // CoinGecko skip kalau partial — pakai cache untuk symbol ini
        const cached = getCached(c.symbol);
        if (cached) out.push(cached);
        continue;
      }
      const t: Ticker = {
        symbol: c.symbol,
        label: c.label,
        group: 'crypto',
        last: row.usd,
        change24hPct: typeof row.usd_24h_change === 'number' ? row.usd_24h_change : 0,
        currency: 'USD',
      };
      putCache(t);
      out.push(t);
    }
    return out;
  } catch (err) {
    log.warn(`Crypto fetch failed: ${err instanceof Error ? err.message : 'unknown'}`);
    // Total fail — return semua cache yang masih valid
    const stale: Ticker[] = [];
    for (const c of CRYPTO_MAP) {
      const cached = getCached(c.symbol);
      if (cached) stale.push(cached);
    }
    return stale;
  }
}

/** Fetch Yahoo single dengan 1 retry — backoff 800ms. Timeout 4s per attempt.
 *  Total worst-case latency = 4s + 800ms + 4s ≈ 9s per symbol. Tapi karena
 *  parallel via Promise.all, total = max single = 9s (jarang).
 *
 *  Untuk handle EAI_AGAIN DNS error spesifik, retry seharusnya cukup karena
 *  systemd-resolved biasanya recover dalam 1-2 detik. */
async function fetchYahooSingleWithRetry(item: typeof YAHOO_MAP[number]): Promise<Ticker | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 800));
    }
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.ticker)}`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(4_000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        next: { revalidate: 60 },
      });
      if (!res.ok) continue;
      const data = await res.json() as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; chartPreviousClose?: number; currency?: string } }> } };
      const meta = data.chart?.result?.[0]?.meta;
      if (!meta || typeof meta.regularMarketPrice !== 'number') continue;
      const last = meta.regularMarketPrice;
      const prev = typeof meta.chartPreviousClose === 'number' ? meta.chartPreviousClose : last;
      const pct = prev !== 0 ? ((last - prev) / prev) * 100 : 0;
      const currency: 'USD' | 'IDR' = meta.currency === 'IDR' ? 'IDR' : 'USD';
      const t: Ticker = {
        symbol: item.symbol,
        label: item.label,
        group: item.group,
        last,
        change24hPct: pct,
        currency,
      };
      putCache(t);
      return t;
    } catch {
      // retry loop
    }
  }
  return null;
}

async function fetchYahoo(): Promise<Ticker[]> {
  const results = await Promise.all(YAHOO_MAP.map(fetchYahooSingleWithRetry));
  const out: Ticker[] = [];
  let liveCount = 0;
  let cachedCount = 0;
  for (let i = 0; i < YAHOO_MAP.length; i++) {
    const item = YAHOO_MAP[i];
    const live = results[i];
    if (live) {
      out.push(live);
      liveCount++;
    } else {
      // Stale-while-error: pakai last-known-good
      const cached = getCached(item.symbol);
      if (cached) {
        out.push(cached);
        cachedCount++;
      }
    }
  }
  if (cachedCount > 0) {
    log.info(`Yahoo fetch: ${liveCount} live, ${cachedCount} from stale cache (Yahoo upstream partial fail)`);
  }
  return out;
}

export async function GET() {
  const startedAt = Date.now();
  const [crypto, yahoo] = await Promise.all([fetchCrypto(), fetchYahoo()]);

  // Order: commodity → crypto → forex → index (institutional eye-flow)
  const commodity = yahoo.filter((t) => t.group === 'commodity');
  const forex = yahoo.filter((t) => t.group === 'forex');
  const index = yahoo.filter((t) => t.group === 'index');
  const tickers = [...commodity, ...crypto, ...forex, ...index];

  const latencyMs = Date.now() - startedAt;

  return NextResponse.json(
    {
      ok: true,
      tickers,
      generatedAt: new Date().toISOString(),
      meta: {
        latencyMs,
        counts: { commodity: commodity.length, crypto: crypto.length, forex: forex.length, index: index.length, total: tickers.length },
      },
    },
    {
      headers: {
        // Browser 60s, CDN 5 min fresh + 15 min stale-while-revalidate.
        // Lebih agresif dari sebelumnya (60s s-maxage + 5 min swr) karena
        // upstream Yahoo DNS flap — kita prefer serve cached longer untuk
        // resilience.
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=900',
      },
    },
  );
}
