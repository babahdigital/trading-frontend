export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { STATIC_SYMBOL_CATALOG } from '@/lib/trading/symbols';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/symbols');

/**
 * GET /api/client/symbols — return available trading symbols.
 *
 * Tries backend VPS1 via scoped token ('research' scope for now, until
 * a dedicated 'execution-cloud' scope is added). Graceful degradation:
 * if backend is unreachable or returns empty, returns the static seed
 * catalog so the UI is never broken.
 *
 * Query params:
 *   login  — optional MT5 login (for Model A VPS_INSTALLATION customer)
 */
export async function GET(request: NextRequest) {
  const login = request.nextUrl.searchParams.get('login');
  const path = login
    ? `/v1/accounts/${encodeURIComponent(login)}/symbols`
    : '/v1/symbols';

  try {
    const res = await proxyToMasterBackend('research', path, { method: 'GET' });
    if (res.ok) {
      const body = await res.json();
      const backendSymbols = Array.isArray(body?.data) ? body.data : Array.isArray(body?.symbols) ? body.symbols : null;
      if (backendSymbols && backendSymbols.length > 0) {
        return NextResponse.json({
          source: 'backend',
          symbols: backendSymbols.map(normalizeBackendSymbol),
        });
      }
    }
    log.warn(`Backend symbols fallback: HTTP ${res.status}`);
  } catch (err) {
    log.warn(`Backend symbols error: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  // Fallback to static catalog
  return NextResponse.json({
    source: 'static',
    symbols: STATIC_SYMBOL_CATALOG,
  });
}

interface BackendSymbolRaw {
  symbol?: string;
  canonical?: string;
  description?: string;
  asset_class?: string;
  spread_current?: number;
  trade_mode?: string;
}

function normalizeBackendSymbol(raw: BackendSymbolRaw): Record<string, unknown> {
  return {
    symbol: raw.symbol ?? '',
    canonical: raw.canonical ?? raw.symbol,
    description: raw.description ?? raw.symbol ?? '',
    assetClass: mapAssetClass(raw.asset_class),
    spreadPips: raw.spread_current,
    tradeMode: raw.trade_mode ?? 'full',
    source: 'backend',
  };
}

function mapAssetClass(raw?: string): string {
  if (!raw) return 'FOREX';
  const upper = raw.toUpperCase();
  if (['FOREX', 'METAL', 'CRYPTO', 'INDEX', 'COMMODITY'].includes(upper)) return upper;
  return 'FOREX';
}
