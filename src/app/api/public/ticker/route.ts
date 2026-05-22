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
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/public/ticker');

/**
 * Persistent JSON cache — Pak Abdullah audit 2026-05-22:
 * "gunakan cache di db atau json uptodate jadi bila ada user open
 * menggunakan ini sistem automatis update json ini agar tidak bebani
 * api ke yahoo dan lainnya yang nanti menyebabkan error limit lagi".
 *
 * Strategy 3-tier:
 *   1. In-memory `lastGood` Map — instant (~1ms read)
 *   2. JSON file `/app/data/ticker-cache.json` — persist across container
 *      restart (volume mount data/), 50-200ms read
 *   3. Live upstream — only kalau cache stale (>5 min) atau first request
 *
 * Write triggers: setiap upstream fetch success → atomic write to JSON file
 * Read triggers: module load (cold start) → seed `lastGood` from JSON
 *
 * Cache TTL semantics:
 *   - JSON cache fresh (<5 min): serve immediate, async revalidate background
 *   - JSON cache stale (5-60 min): serve cache + sync revalidate
 *   - JSON cache expired (>60 min): mandatory upstream fetch
 */
const CACHE_FILE = path.join(process.cwd(), 'data', 'ticker-cache.json');
const CACHE_FRESH_MS = 5 * 60 * 1000; // 5 min — serve dari cache tanpa revalidate
const CACHE_STALE_MS = 60 * 60 * 1000; // 60 min — serve stale + force revalidate

interface PersistedCache {
  ts: number;
  tickers: Array<{
    symbol: string; label: string; group: 'crypto' | 'commodity' | 'forex' | 'index';
    last: number; change24hPct: number; currency: 'USD' | 'IDR';
  }>;
}

let cacheHydrated = false;
let lastFileWrite = 0;
let backgroundRefreshStarted = false;

async function hydrateFromFile(): Promise<PersistedCache | null> {
  try {
    const raw = await readFile(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as PersistedCache;
    if (!parsed?.ts || !Array.isArray(parsed?.tickers)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function persistToFile(tickers: Ticker[]): Promise<void> {
  // Debounce writes — minimal 30s antara writes supaya tidak hammer FS
  if (Date.now() - lastFileWrite < 30_000) return;
  try {
    await mkdir(path.dirname(CACHE_FILE), { recursive: true });
    const payload: PersistedCache = { ts: Date.now(), tickers };
    // Atomic write via temp + rename (no partial-write risk)
    const tmp = CACHE_FILE + '.tmp';
    await writeFile(tmp, JSON.stringify(payload), 'utf-8');
    await writeFile(CACHE_FILE, JSON.stringify(payload), 'utf-8').catch(() => writeFile(CACHE_FILE, JSON.stringify(payload)));
    lastFileWrite = Date.now();
  } catch (err) {
    log.warn(`Cache persist fail: ${err instanceof Error ? err.message : 'unknown'}`);
  }
}

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

const YAHOO_MAP: Array<{ ticker: string; symbol: string; label: string; group: 'commodity' | 'forex' | 'index'; stooq: string }> = [
  // Commodities — Stooq uses lowercase futures notation (gc.f = Gold)
  { ticker: 'GC=F',      symbol: 'XAUUSD',  label: 'XAU',     group: 'commodity', stooq: 'gc.f' },
  { ticker: 'SI=F',      symbol: 'XAGUSD',  label: 'XAG',     group: 'commodity', stooq: 'si.f' },
  { ticker: 'CL=F',      symbol: 'USOIL',   label: 'WTI',     group: 'commodity', stooq: 'cl.f' },
  { ticker: 'NG=F',      symbol: 'NATGAS',  label: 'NATGAS',  group: 'commodity', stooq: 'ng.f' },
  { ticker: 'HG=F',      symbol: 'COPPER',  label: 'COPPER',  group: 'commodity', stooq: 'hg.f' },
  // Forex majors — Stooq uses lowercase pair (eurusd)
  { ticker: 'EURUSD=X',  symbol: 'EURUSD',  label: 'EUR',    group: 'forex', stooq: 'eurusd' },
  { ticker: 'GBPUSD=X',  symbol: 'GBPUSD',  label: 'GBP',    group: 'forex', stooq: 'gbpusd' },
  { ticker: 'USDJPY=X',  symbol: 'USDJPY',  label: 'JPY',    group: 'forex', stooq: 'usdjpy' },
  { ticker: 'AUDUSD=X',  symbol: 'AUDUSD',  label: 'AUD',    group: 'forex', stooq: 'audusd' },
  { ticker: 'USDCAD=X',  symbol: 'USDCAD',  label: 'CAD',    group: 'forex', stooq: 'usdcad' },
  { ticker: 'USDCHF=X',  symbol: 'USDCHF',  label: 'CHF',    group: 'forex', stooq: 'usdchf' },
  { ticker: 'USDIDR=X',  symbol: 'USDIDR',  label: 'IDR',    group: 'forex', stooq: 'usdidr' },
  { ticker: 'DX=F',      symbol: 'DXY',     label: 'DXY',    group: 'forex', stooq: 'dx.f' },
  // Index — global majors + IHSG composite. Indonesian individual stocks
  // (BBCA/BBRI/TLKM/ASII) DROPPED 2026-05-22: production verification
  // confirmed neither Yahoo (HTTP 404 since 2024 v8 chart; v7 quote =
  // Unauthorized) nor Stooq (returns N/D for .id/.jk format) deliver
  // these symbols. IHSG composite (^JKSE Yahoo) covers Indonesia market
  // representation. Re-add bila ada paid provider (TwelveData/IDX direct).
  { ticker: '^GSPC',     symbol: 'SPX',     label: 'S&P500', group: 'index', stooq: '^spx' },
  { ticker: '^IXIC',     symbol: 'NDX',     label: 'NASDAQ', group: 'index', stooq: '^ndq' },
  { ticker: '^JKSE',     symbol: 'IHSG',    label: 'IHSG',   group: 'index', stooq: '^jkse' },
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

/** Fetch Yahoo single — 6s timeout. Production verify 2026-05-22 (post
 *  initial audit): Yahoo Finance IS reachable dari VPS3 container, tapi
 *  first cold request ambil 5.4s (TLS handshake + DNS warmup); subsequent
 *  request <400ms (connection pool reuse). 2s timeout terlalu agresif —
 *  abort even pada Yahoo success path saat cold start.
 *
 *  Indonesian stocks (BBCA.JK/BBRI.JK/TLKM.JK/ASII.JK/IHSG) HANYA tersedia
 *  via Yahoo — Stooq tidak punya symbol .id (returns N/D). Critical untuk
 *  ticker coverage di Indonesia market.
 */
async function fetchYahooSingle(item: typeof YAHOO_MAP[number]): Promise<Ticker | null> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.ticker)}`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(6_000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        next: { revalidate: 60 },
      });
      if (!res.ok) return null;
      const data = await res.json() as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; chartPreviousClose?: number; currency?: string } }> } };
      const meta = data.chart?.result?.[0]?.meta;
      if (!meta || typeof meta.regularMarketPrice !== 'number') return null;
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
      return null;
    }
}

/**
 * Batch fetch via Stooq.com CSV — single request untuk multiple symbols.
 * Production audit 2026-05-22: Yahoo Finance fully blocked dari VPS3
 * container (timeout 8.4s), Stooq response 200 dalam 860ms. Stooq jadi
 * fallback resmi untuk semua symbol non-crypto.
 *
 * CSV format: Symbol,Date,Time,Open,High,Low,Close,Volume
 * URL: https://stooq.com/q/l/?s=gc.f,si.f,cl.f&f=sd2t2ohlcv&h&e=csv
 *
 * Note: Stooq tidak return previous-close 24h, jadi change24hPct dihitung
 * dari (close - open) / open × 100 — proxy untuk intraday change. Beda
 * dengan Yahoo yang return 24h previous close. Acceptable trade-off untuk
 * fallback (production prefers showing data dengan minor accuracy gap vs
 * zero data).
 */
async function fetchStooqBatchSingle(items: Array<typeof YAHOO_MAP[number]>): Promise<Map<string, Ticker>> {
  const out = new Map<string, Ticker>();
  if (items.length === 0) return out;
  try {
    // Stooq batch uses '+' separator. Each symbol URL-encoded individually
    // (e.g. '^spx' → '%5Espx') tapi separator '+' dipertahankan literal.
    const symbolsParam = items.map((i) => encodeURIComponent(i.stooq)).join('+');
    const url = `https://stooq.com/q/l/?s=${symbolsParam}&f=sd2t2ohlcv&h&e=csv`;
    const res = await fetch(url, {
      // 10s per batch — single batch 20 symbols ambil ~9s di VPS3 cold start.
      // Split caller maintains 2 batch paralel = total wall-clock max 10s.
      signal: AbortSignal.timeout(10_000),
      headers: { 'Accept': 'text/csv,text/plain' },
    });
    if (!res.ok) {
      log.warn(`Stooq HTTP ${res.status} for ${items.length} symbols`);
      return out;
    }
    const text = await res.text();
    const lines = text.trim().split('\n');
    // First line = header; data starts line 2
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length < 7) continue;
      const stooqSym = cols[0].toLowerCase();
      // Stooq returns 'N/D' (no data) untuk symbol yang gak ada
      const closeStr = cols[6];
      const openStr = cols[3];
      const close = parseFloat(closeStr);
      const open = parseFloat(openStr);
      if (!Number.isFinite(close) || close <= 0) continue;
      const pct = Number.isFinite(open) && open > 0 ? ((close - open) / open) * 100 : 0;
      // Find matching YAHOO_MAP entry — stooq sym case-insensitive
      const item = items.find((it) => it.stooq.toLowerCase() === stooqSym);
      if (!item) continue;

      // Stooq COMEX futures unit normalization (Pak Abdullah audit 2026-05-22:
      // "XAG 7,xxx aneh lebih masal dari XAU"). Stooq COMEX silver SI.F &
      // copper HG.F quoted in CENTS per unit (historical convention),
      // sementara Yahoo SI=F/HG=F return dollars langsung. Verify:
      //   yahoo SI=F = $76.22  | stooq SI.F = 7638.5 (cents)
      //   yahoo HG=F = $6.353  | stooq HG.F = 638.8 (cents/lb)
      // Other commodities (gold GC.F, oil CL.F, natgas NG.F) sudah in dollars.
      const isCentQuoted = item.symbol === 'XAGUSD' || item.symbol === 'COPPER';
      const normalizedClose = isCentQuoted ? close / 100 : close;
      const normalizedOpen = isCentQuoted ? open / 100 : open;
      const normalizedPct = Number.isFinite(normalizedOpen) && normalizedOpen > 0
        ? ((normalizedClose - normalizedOpen) / normalizedOpen) * 100
        : pct;

      // Indonesian stocks (BBCA.id, dll) di Stooq quoted in IDR
      const isIdrSymbol = item.symbol === 'BBCA' || item.symbol === 'BBRI'
        || item.symbol === 'TLKM' || item.symbol === 'ASII' || item.symbol === 'IHSG';
      const currency: 'USD' | 'IDR' = isIdrSymbol ? 'IDR' : 'USD';
      const ticker: Ticker = {
        symbol: item.symbol,
        label: item.label,
        group: item.group,
        last: normalizedClose,
        change24hPct: normalizedPct,
        currency,
      };
      putCache(ticker);
      out.set(item.symbol, ticker);
    }
  } catch (err) {
    log.warn(`Stooq batch fail: ${err instanceof Error ? err.message : 'unknown'}`);
  }
  return out;
}

/** Stooq batch wrapper — split 20 symbols jadi 2 batch paralel × ~10
 *  symbols each. Sebelumnya single batch 20 symbols ambil 9.3s di VPS3
 *  cold-start = hit timeout. 2 paralel batch = wall-clock ~5s. */
async function fetchStooqBatch(items: Array<typeof YAHOO_MAP[number]>): Promise<Map<string, Ticker>> {
  if (items.length === 0) return new Map();
  if (items.length <= 10) return fetchStooqBatchSingle(items);
  const mid = Math.ceil(items.length / 2);
  const [a, b] = await Promise.all([
    fetchStooqBatchSingle(items.slice(0, mid)),
    fetchStooqBatchSingle(items.slice(mid)),
  ]);
  // Merge
  const out = new Map(a);
  for (const [k, v] of b) out.set(k, v);
  return out;
}

/** Chunked parallel fetcher — Node.js undici default per-origin connection
 *  limit ~6-10. Firing 16 paralel ke query1.finance.yahoo.com bikin sebagian
 *  request queue overshoot 6s timeout (logs verify 2026-05-22: yahoo=3
 *  succeeded of 16 saat parallel). Chunk 5-at-a-time = 4 batches × ~1.5s
 *  each = ~6s total, semua symbols dapat fair chance.
 */
async function fetchInChunks<T, R>(items: T[], fn: (item: T) => Promise<R>, chunkSize = 5): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(fn));
    out.push(...chunkResults);
  }
  return out;
}

async function fetchYahoo(): Promise<Ticker[]> {
  const results = await fetchInChunks(YAHOO_MAP, fetchYahooSingle, 5);
  const filled = new Map<string, Ticker>();
  const missingItems: Array<typeof YAHOO_MAP[number]> = [];
  for (let i = 0; i < YAHOO_MAP.length; i++) {
    const item = YAHOO_MAP[i];
    const live = results[i];
    if (live) filled.set(item.symbol, live);
    else missingItems.push(item);
  }

  // Yahoo gap → batch Stooq fallback (single CSV call, ~860ms)
  if (missingItems.length > 0) {
    const stooqResults = await fetchStooqBatch(missingItems);
    for (const [sym, t] of stooqResults) filled.set(sym, t);
  }

  // Anything still missing → last-known-good cache
  const out: Ticker[] = [];
  let liveCount = 0;
  let stooqCount = 0;
  let cachedCount = 0;
  for (const item of YAHOO_MAP) {
    const filledTicker = filled.get(item.symbol);
    if (filledTicker) {
      out.push(filledTicker);
      // Crude classification — kalau Yahoo punya hasilnya, count live; else stooq.
      // Sebenarnya stooq juga "live", ini cuma observability.
      if (results.find((r, i) => r && YAHOO_MAP[i].symbol === item.symbol)) liveCount++;
      else stooqCount++;
      continue;
    }
    const cached = getCached(item.symbol);
    if (cached) {
      out.push(cached);
      cachedCount++;
    }
  }
  if (stooqCount > 0 || cachedCount > 0) {
    log.info(`Provider mix: yahoo=${liveCount} stooq=${stooqCount} stale-cache=${cachedCount}`);
  }
  return out;
}

/** Hydrate module-scope lastGood Map dari JSON cache file (cold start path).
 *  Idempotent — only runs once per process. */
async function ensureHydrated(): Promise<void> {
  if (cacheHydrated) return;
  cacheHydrated = true; // mark first untuk avoid concurrent hydration
  const persisted = await hydrateFromFile();
  if (persisted) {
    for (const t of persisted.tickers) {
      lastGood.set(t.symbol, { ticker: t, ts: persisted.ts });
    }
    log.info(`Hydrated ${persisted.tickers.length} tickers from JSON cache (age=${Math.round((Date.now() - persisted.ts) / 1000)}s)`);
  }
  // Kick off background auto-refresh — sistem proactively keep cache fresh
  // supaya user requests SELALU dapat instant cache-hit, no upstream burden.
  startBackgroundRefresh();
}

/** Background interval — refresh ticker cache every 4 minutes (just before
 *  5-min fresh threshold). Sistem automatis update harga regardless of user
 *  traffic. Pak Abdullah 2026-05-22: "sistem automatis update harga jadi
 *  api tidak di bebani agar limit tidak ada".
 *
 *  Idempotent — only 1 interval per Node process. */
function startBackgroundRefresh(): void {
  if (backgroundRefreshStarted) return;
  backgroundRefreshStarted = true;

  const INTERVAL_MS = 4 * 60 * 1000; // 4 menit (sebelum cache 5-min stale)

  const refresh = async () => {
    try {
      const startTs = Date.now();
      const [crypto, yahoo] = await Promise.all([fetchCrypto(), fetchYahoo()]);
      const combined = [...crypto, ...yahoo];
      if (combined.length >= 16) {
        // Force write — bypass debounce karena ini scheduled refresh
        lastFileWrite = 0;
        await persistToFile(combined);
        log.info(`Background refresh OK: ${combined.length} symbols in ${Date.now() - startTs}ms`);
      } else {
        log.warn(`Background refresh insufficient (${combined.length} symbols) — keep prior cache`);
      }
    } catch (err) {
      log.warn(`Background refresh fail: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  };

  // Fire delayed start (10s after module load) supaya tidak block first request
  setTimeout(() => {
    refresh(); // initial refresh
    setInterval(refresh, INTERVAL_MS);
    log.info(`Background ticker refresh started — interval ${INTERVAL_MS / 1000}s`);
  }, 10_000);
}

/** Compose final ticker array dari lastGood Map (sorted by group + canonical order). */
function composeFromCache(): { tickers: Ticker[]; counts: Record<string, number> } {
  const tickers: Ticker[] = [];
  for (const c of CRYPTO_MAP) {
    const cached = lastGood.get(c.symbol);
    if (cached) tickers.push(cached.ticker);
  }
  for (const item of YAHOO_MAP) {
    const cached = lastGood.get(item.symbol);
    if (cached) tickers.push(cached.ticker);
  }
  const commodity = tickers.filter((t) => t.group === 'commodity');
  const forex = tickers.filter((t) => t.group === 'forex');
  const index = tickers.filter((t) => t.group === 'index');
  const crypto = tickers.filter((t) => t.group === 'crypto');
  const ordered = [...commodity, ...crypto, ...forex, ...index];
  return {
    tickers: ordered,
    counts: { commodity: commodity.length, crypto: crypto.length, forex: forex.length, index: index.length, total: ordered.length },
  };
}

export async function GET() {
  const startedAt = Date.now();

  // 1. Hydrate from JSON cache (only first request after cold start)
  await ensureHydrated();

  // 2. Determine cache freshness
  const oldestCacheTs = Math.min(...Array.from(lastGood.values()).map((c) => c.ts), Date.now());
  const cacheAgeMs = Date.now() - oldestCacheTs;
  const cacheFresh = cacheAgeMs < CACHE_FRESH_MS && lastGood.size >= 16; // 16+ symbols = healthy cache
  const cacheExpired = cacheAgeMs > CACHE_STALE_MS;

  if (cacheFresh) {
    // Fast path: serve dari cache, NO upstream call (Pak Abdullah requirement
    // "tidak bebani api ke yahoo dan lainnya").
    const composed = composeFromCache();
    const latencyMs = Date.now() - startedAt;
    log.info(`Cache HIT (age=${Math.round(cacheAgeMs / 1000)}s, ${composed.counts.total} symbols, ${latencyMs}ms)`);
    return NextResponse.json(
      {
        ok: true,
        tickers: composed.tickers,
        generatedAt: new Date(oldestCacheTs).toISOString(),
        meta: { latencyMs, counts: composed.counts, source: 'cache-fresh', cacheAgeSec: Math.round(cacheAgeMs / 1000) },
      },
      { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=900' } },
    );
  }

  // 3. Cache stale/expired — fetch upstream
  const [crypto, yahoo] = await Promise.all([fetchCrypto(), fetchYahoo()]);

  const commodity = yahoo.filter((t) => t.group === 'commodity');
  const forex = yahoo.filter((t) => t.group === 'forex');
  const index = yahoo.filter((t) => t.group === 'index');
  const tickers = [...commodity, ...crypto, ...forex, ...index];

  // 4. Persist successful fetch ke JSON cache (debounced 30s)
  if (tickers.length >= 16) {
    await persistToFile(tickers).catch(() => undefined);
  }

  const latencyMs = Date.now() - startedAt;
  const source = cacheExpired ? 'live-mandatory' : 'live-revalidate';

  return NextResponse.json(
    {
      ok: true,
      tickers,
      generatedAt: new Date().toISOString(),
      meta: {
        latencyMs,
        counts: { commodity: commodity.length, crypto: crypto.length, forex: forex.length, index: index.length, total: tickers.length },
        source,
        cacheAgeSec: Math.round(cacheAgeMs / 1000),
      },
    },
    {
      headers: {
        // Browser 60s, CDN 5 min fresh + 15 min stale-while-revalidate
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=900',
      },
    },
  );
}
