/**
 * Public market ticker — aggregate prices dari multiple free sources untuk
 * live ticker bar di top of public pages (Pak Abdullah directive 2026-05-21).
 *
 * Sources:
 *   - Crypto (BTC/ETH/XRP/etc): CoinGecko simple/price API (free, no auth)
 *   - Forex/Commodity (XAU/USOIL/DXY): Yahoo Finance chart API (free, no auth,
 *     UA header required)
 *
 * Caching:
 *   - Browser: 30s (Cache-Control max-age)
 *   - CDN: 60s s-maxage + 5-min stale-while-revalidate
 *   - Server-side: relies on CDN/browser; fail-soft kalau source down
 *
 * Response shape:
 *   { ok: true, tickers: [{ symbol, label, group, last, change24hPct, currency }], generatedAt }
 *
 * Note: Binance terblok dari VPS3 (kemungkinan geo restriction); CoinGecko
 * dipilih sebagai source utama crypto (no geo block, free public tier).
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

// Expanded ticker universe — Pak Abdullah directive 2026-05-21 "tambahkan lagi
// terlalu sedikit perkaya lagi". 8 → 24 symbols mencakup:
//   - Commodity (5): Gold, Silver, Oil, NatGas, Copper
//   - Forex major (8): EUR, GBP, JPY, AUD, CAD, CHF, NZD, USDIDR (Indonesia)
//   - Crypto major (8): BTC, ETH, XRP, SOL, BNB, ADA, DOGE, AVAX
//   - Index (3): SPX, NASDAQ, JKSE (Indonesia Composite)
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
  // Index — IHSG = label native Indonesia (sebelumnya 'JKSE' English),
  // plus BBRI/BBCA liquid Indonesian blue-chip per Pak Abdullah 2026-05-21.
  { ticker: '^GSPC',     symbol: 'SPX',     label: 'S&P500', group: 'index' },
  { ticker: '^IXIC',     symbol: 'NDX',     label: 'NASDAQ', group: 'index' },
  { ticker: '^JKSE',     symbol: 'IHSG',    label: 'IHSG',   group: 'index' },
  { ticker: 'BBCA.JK',   symbol: 'BBCA',    label: 'BBCA',   group: 'index' },
  { ticker: 'BBRI.JK',   symbol: 'BBRI',    label: 'BBRI',   group: 'index' },
  { ticker: 'TLKM.JK',   symbol: 'TLKM',    label: 'TLKM',   group: 'index' },
  { ticker: 'ASII.JK',   symbol: 'ASII',    label: 'ASII',   group: 'index' },
];

async function fetchCrypto(): Promise<Ticker[]> {
  try {
    const ids = CRYPTO_MAP.map((c) => c.id).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8_000),
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
    const data = await res.json() as Record<string, { usd?: number; usd_24h_change?: number }>;
    const out: Ticker[] = [];
    for (const c of CRYPTO_MAP) {
      const row = data[c.id];
      if (!row || typeof row.usd !== 'number') continue;
      out.push({
        symbol: c.symbol,
        label: c.label,
        group: 'crypto',
        last: row.usd,
        change24hPct: typeof row.usd_24h_change === 'number' ? row.usd_24h_change : 0,
        currency: 'USD',
      });
    }
    return out;
  } catch (err) {
    log.warn(`Crypto fetch failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return [];
  }
}

async function fetchYahooSingle(item: typeof YAHOO_MAP[number]): Promise<Ticker | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.ticker)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6_000),
      headers: {
        // Yahoo Finance reject default fetch UA → 403. Pakai browser UA.
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const data = await res.json() as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; chartPreviousClose?: number; currency?: string } }> } };
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== 'number') return null;
    const last = meta.regularMarketPrice;
    const prev = typeof meta.chartPreviousClose === 'number' ? meta.chartPreviousClose : last;
    const pct = prev !== 0 ? ((last - prev) / prev) * 100 : 0;
    // Yahoo Finance return currency native — Indonesian stocks (BBCA.JK, etc)
    // return IDR. Forward currency supaya FE format Rp untuk IDR, $ untuk USD.
    const currency: 'USD' | 'IDR' = meta.currency === 'IDR' ? 'IDR' : 'USD';
    return {
      symbol: item.symbol,
      label: item.label,
      group: item.group,
      last,
      change24hPct: pct,
      currency,
    };
  } catch {
    return null;
  }
}

async function fetchYahoo(): Promise<Ticker[]> {
  const results = await Promise.all(YAHOO_MAP.map(fetchYahooSingle));
  return results.filter((x): x is Ticker => x !== null);
}

export async function GET() {
  const [crypto, yahoo] = await Promise.all([fetchCrypto(), fetchYahoo()]);
  // Order: commodity → crypto → forex (institutional eye-flow)
  const commodity = yahoo.filter((t) => t.group === 'commodity');
  const forex = yahoo.filter((t) => t.group === 'forex');
  const tickers = [...commodity, ...crypto, ...forex];

  return NextResponse.json(
    { ok: true, tickers, generatedAt: new Date().toISOString() },
    {
      headers: {
        // Browser 30s, CDN 60s, stale-while-revalidate 5 min
        'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}
