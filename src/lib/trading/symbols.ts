/**
 * Trading symbol catalog + resolution helpers per ADR-013.
 *
 * Per the multi-broker abstraction, customers must NEVER type symbols
 * manually. UI components fetch the available catalog from the backend
 * (which knows per-broker canonical mappings like XAUUSD → XAUUSDm on
 * Exness or XAUUSD.pro on IC Markets) and render a dropdown.
 *
 * Fallback: if the backend endpoint is unreachable (early deployment
 * phase) this module also exposes a static seed catalog so the UI can
 * still render a usable selector for the 16 major pairs BabahAlgo trades.
 *
 * Asset-class-aware: supports forex today, crypto/multi via assetClass
 * discriminator (matches BlogTopic.AssetClass enum).
 */

export type SymbolAssetClass = 'FOREX' | 'METAL' | 'CRYPTO' | 'INDEX' | 'COMMODITY';

export type SymbolTradeMode = 'full' | 'close_only' | 'disabled' | 'long_only' | 'short_only';

export interface TradingSymbol {
  /** Display symbol, e.g. "EURUSD" */
  symbol: string;
  /** Canonical form used for order submission (may differ from display) */
  canonical?: string;
  /** Human-friendly description */
  description: string;
  /** Asset class for UI grouping */
  assetClass: SymbolAssetClass;
  /** Current spread hint in pips (optional, advisory) */
  spreadPips?: number;
  /** Trading availability */
  tradeMode: SymbolTradeMode;
  /** Source: 'backend' = from VPS1 live, 'static' = seed fallback */
  source: 'backend' | 'static';
}

/**
 * Static fallback catalog — 16 major pairs BabahAlgo supports by default.
 * Used when live backend symbols endpoint returns empty / errors.
 */
export const STATIC_SYMBOL_CATALOG: readonly TradingSymbol[] = [
  // FX Majors
  { symbol: 'EURUSD', description: 'Euro / US Dollar', assetClass: 'FOREX', spreadPips: 0.8, tradeMode: 'full', source: 'static' },
  { symbol: 'GBPUSD', description: 'British Pound / US Dollar', assetClass: 'FOREX', spreadPips: 1.0, tradeMode: 'full', source: 'static' },
  { symbol: 'USDJPY', description: 'US Dollar / Japanese Yen', assetClass: 'FOREX', spreadPips: 0.9, tradeMode: 'full', source: 'static' },
  { symbol: 'USDCHF', description: 'US Dollar / Swiss Franc', assetClass: 'FOREX', spreadPips: 1.2, tradeMode: 'full', source: 'static' },
  { symbol: 'AUDUSD', description: 'Australian Dollar / US Dollar', assetClass: 'FOREX', spreadPips: 1.0, tradeMode: 'full', source: 'static' },
  { symbol: 'USDCAD', description: 'US Dollar / Canadian Dollar', assetClass: 'FOREX', spreadPips: 1.3, tradeMode: 'full', source: 'static' },
  { symbol: 'NZDUSD', description: 'New Zealand Dollar / US Dollar', assetClass: 'FOREX', spreadPips: 1.4, tradeMode: 'full', source: 'static' },
  // FX Cross
  { symbol: 'EURGBP', description: 'Euro / British Pound', assetClass: 'FOREX', spreadPips: 1.1, tradeMode: 'full', source: 'static' },
  { symbol: 'EURJPY', description: 'Euro / Japanese Yen', assetClass: 'FOREX', spreadPips: 1.2, tradeMode: 'full', source: 'static' },
  { symbol: 'GBPJPY', description: 'British Pound / Japanese Yen', assetClass: 'FOREX', spreadPips: 1.8, tradeMode: 'full', source: 'static' },
  // Metals
  { symbol: 'XAUUSD', description: 'Gold / US Dollar', assetClass: 'METAL', spreadPips: 2.0, tradeMode: 'full', source: 'static' },
  { symbol: 'XAGUSD', description: 'Silver / US Dollar', assetClass: 'METAL', spreadPips: 2.5, tradeMode: 'full', source: 'static' },
  // Indices
  { symbol: 'US30', description: 'Dow Jones 30', assetClass: 'INDEX', spreadPips: 1.5, tradeMode: 'full', source: 'static' },
  { symbol: 'NAS100', description: 'Nasdaq 100', assetClass: 'INDEX', spreadPips: 2.0, tradeMode: 'full', source: 'static' },
  // Commodities
  { symbol: 'USOIL', description: 'WTI Crude Oil', assetClass: 'COMMODITY', spreadPips: 3.0, tradeMode: 'full', source: 'static' },
  // Crypto (future — covered by AssetClass.CRYPTO)
  { symbol: 'BTCUSD', description: 'Bitcoin / US Dollar', assetClass: 'CRYPTO', spreadPips: 15.0, tradeMode: 'full', source: 'static' },
] as const;

export interface FetchSymbolsOptions {
  /** MT5 login (for VPS_INSTALLATION customer) — optional */
  mt5Login?: string;
  /** Filter by asset class */
  assetClass?: SymbolAssetClass | SymbolAssetClass[];
  /** Use static catalog regardless of backend availability */
  forceStatic?: boolean;
  /** AbortSignal for fetch cancellation */
  signal?: AbortSignal;
}

/**
 * Fetch available trading symbols. Tries the Next.js proxy endpoint
 * (/api/client/symbols) first; falls back to the static catalog on
 * error or empty response. Never throws — always returns a non-empty
 * catalog (worst case: static fallback).
 */
export async function fetchSymbols(options: FetchSymbolsOptions = {}): Promise<TradingSymbol[]> {
  const { mt5Login, assetClass, forceStatic, signal } = options;

  if (forceStatic) return filterByAssetClass([...STATIC_SYMBOL_CATALOG], assetClass);

  try {
    const qs = new URLSearchParams();
    if (mt5Login) qs.set('login', mt5Login);
    const url = `/api/client/symbols${qs.toString() ? `?${qs}` : ''}`;
    const res = await fetch(url, { signal, credentials: 'include' });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { symbols?: TradingSymbol[] };
    const live = body.symbols ?? [];
    if (live.length === 0) throw new Error('empty symbol list from backend');
    return filterByAssetClass(live.map((s) => ({ ...s, source: 'backend' as const })), assetClass);
  } catch {
    return filterByAssetClass([...STATIC_SYMBOL_CATALOG], assetClass);
  }
}

function filterByAssetClass(
  symbols: TradingSymbol[],
  assetClass?: SymbolAssetClass | SymbolAssetClass[],
): TradingSymbol[] {
  if (!assetClass) return symbols;
  const filter = Array.isArray(assetClass) ? assetClass : [assetClass];
  return symbols.filter((s) => filter.includes(s.assetClass));
}

/**
 * Resolve a display symbol to its canonical form for order submission.
 * For static-sourced symbols this is usually identity; backend-sourced
 * symbols may carry different canonical forms per broker.
 */
export function resolveCanonicalSymbol(symbol: TradingSymbol): string {
  return symbol.canonical ?? symbol.symbol;
}

/** Pretty label for selector options: "EURUSD — Euro / US Dollar" */
export function formatSymbolLabel(symbol: TradingSymbol): string {
  return `${symbol.symbol} — ${symbol.description}`;
}
