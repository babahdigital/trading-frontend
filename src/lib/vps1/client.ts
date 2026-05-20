/**
 * VPS1 commercial API client — microservice-aware (post 2026-05-16 audit).
 *
 * Backend VPS1 sudah migrate dari unified gateway (port 8000, sekarang dead)
 * ke microservices terdistribusi:
 *   - 8101  Trading-forex backend (`/api/forex/*`, X-API-Token)
 *   - 8211  Signals API (`/v1/signals/*`, X-Api-Key)
 *   - 8210..8220  News / Indicators / Market-data / Calendar / dll
 *
 * Each scope routes ke base URL + header type yang berbeda. Env vars:
 *   - VPS1_FOREX_URL  (8101) — fallback ke VPS1_BACKEND_URL
 *   - VPS1_SIGNALS_URL (8211) — fallback ke VPS1_BACKEND_URL
 *   - VPS1_BACKEND_URL (legacy / fallback)
 *
 * Scope tokens dibaca per-call sehingga env change di server tidak butuh redeploy.
 */

/**
 * 2026-05-19 — scope catalog covers two distinct backend stacks:
 *
 * 1. Forex backend (port 8101) — tenant-scoped trading state. Uses the
 *    `X-API-Token` header dengan tenant API token issued by signup flow.
 *    Scopes: research / pamm / stats / admin / tenant.
 *
 * 2. Public API Marketplace microservices (ports 8210-8220) — provider
 *    of news / signals / indicators / market-data / calendar / ai-explain
 *    / substrate primitives. Auth via `X-Api-Key: babasvc_<scoped-key>`
 *    issued per-service oleh backend admin endpoint.
 *    Scopes: news / signals / trade_events / indicators / market_data /
 *    calendar / ai_explain / substrate.
 *
 * Each scope routes to a dedicated env var + tunnel port; fallback ke
 * VPS1_BACKEND_URL untuk legacy compatibility.
 */
type Scope =
  | 'signals'
  | 'trade_events'
  | 'news'
  | 'indicators'
  | 'market_data'
  | 'calendar'
  | 'ai_explain'
  | 'substrate'
  | 'research'
  | 'pamm' // deprecated
  | 'stats'
  | 'admin'
  | 'tenant';

const SCOPE_ENV: Record<Scope, string> = {
  // Public API Marketplace (X-Api-Key)
  signals: 'VPS1_PUBAPI_SIGNALS_KEY',
  trade_events: 'VPS1_PUBAPI_SIGNALS_KEY', // shares signals key (same upstream)
  news: 'VPS1_PUBAPI_NEWS_KEY',
  indicators: 'VPS1_PUBAPI_INDICATORS_KEY',
  market_data: 'VPS1_PUBAPI_MARKET_DATA_KEY',
  calendar: 'VPS1_PUBAPI_CALENDAR_KEY',
  ai_explain: 'VPS1_PUBAPI_AI_EXPLAIN_KEY',
  substrate: 'VPS1_PUBAPI_SUBSTRATE_KEY',
  // Forex backend (X-API-Token)
  research: 'VPS1_TOKEN_RESEARCH',
  pamm: 'VPS1_ADMIN_TOKEN', // deprecated 2026-04-26
  stats: 'VPS1_TOKEN_STATS',
  admin: 'VPS1_ADMIN_TOKEN',
  tenant: 'VPS1_ADMIN_TOKEN',
};

const SCOPE_AUTH_HEADER: Record<Scope, 'X-Api-Key' | 'X-API-Token'> = {
  signals: 'X-Api-Key',
  trade_events: 'X-Api-Key',
  news: 'X-Api-Key',
  indicators: 'X-Api-Key',
  market_data: 'X-Api-Key',
  calendar: 'X-Api-Key',
  ai_explain: 'X-Api-Key',
  substrate: 'X-Api-Key',
  research: 'X-API-Token',
  pamm: 'X-API-Token',
  stats: 'X-API-Token',
  admin: 'X-API-Token',
  tenant: 'X-API-Token',
};

function tokenFor(scope: Scope): string | undefined {
  // Public API Marketplace scopes MUST NOT fall back to VPS1_ADMIN_TOKEN
  // (which is a forex backend token rejected with 401 oleh microservices).
  const isPubApi = SCOPE_AUTH_HEADER[scope] === 'X-Api-Key';
  if (isPubApi) {
    return process.env[SCOPE_ENV[scope]] || undefined;
  }
  return process.env[SCOPE_ENV[scope]] || process.env.VPS1_ADMIN_TOKEN || undefined;
}

const SCOPE_URL_ENV: Record<Scope, readonly string[]> = {
  signals: ['VPS1_SIGNALS_URL', 'VPS1_BACKEND_URL'],
  trade_events: ['VPS1_SIGNALS_URL', 'VPS1_BACKEND_URL'],
  news: ['VPS1_NEWS_URL', 'VPS1_BACKEND_URL'],
  indicators: ['VPS1_INDICATORS_URL', 'VPS1_BACKEND_URL'],
  market_data: ['VPS1_MARKET_DATA_URL', 'VPS1_BACKEND_URL'],
  calendar: ['VPS1_CALENDAR_URL', 'VPS1_BACKEND_URL'],
  ai_explain: ['VPS1_AI_EXPLAIN_URL', 'VPS1_BACKEND_URL'],
  substrate: ['VPS1_SUBSTRATE_URL', 'VPS1_BACKEND_URL'],
  research: ['VPS1_FOREX_URL', 'VPS1_BACKEND_URL'],
  pamm: ['VPS1_FOREX_URL', 'VPS1_BACKEND_URL'],
  stats: ['VPS1_FOREX_URL', 'VPS1_BACKEND_URL'],
  admin: ['VPS1_FOREX_URL', 'VPS1_BACKEND_URL'],
  tenant: ['VPS1_FOREX_URL', 'VPS1_BACKEND_URL'],
};

function baseUrlFor(scope: Scope): string {
  for (const envKey of SCOPE_URL_ENV[scope]) {
    const url = process.env[envKey];
    if (url) return url;
  }
  throw new Vps1Error(
    503,
    `VPS1 base URL untuk scope "${scope}" tidak terkonfigurasi (cek ${SCOPE_URL_ENV[scope].join(' / ')}).`,
  );
}

/** Forex backend URL khusus untuk /health probe — public, no scope dispatch needed. */
function forexBaseUrl(): string {
  const url = process.env.VPS1_FOREX_URL || process.env.VPS1_BACKEND_URL;
  if (!url) {
    throw new Vps1Error(503, 'VPS1_FOREX_URL / VPS1_BACKEND_URL not configured');
  }
  return url;
}

export class Vps1Error extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
    this.name = 'Vps1Error';
  }
}

async function request<T>(scope: Scope, path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenFor(scope);
  if (!token) {
    throw new Vps1Error(503, `VPS1 token missing for scope "${scope}"`);
  }
  const url = `${baseUrlFor(scope)}${path}`;
  const authHeader = SCOPE_AUTH_HEADER[scope];
  const res = await fetch(url, {
    ...init,
    headers: {
      ...Object.fromEntries(new Headers(init.headers as HeadersInit || {}).entries()),
      [authHeader]: token,
      'User-Agent': 'babahalgo-frontend/1.0',
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  });
  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { body = await res.text().catch(() => ''); }
    throw new Vps1Error(res.status, `VPS1 ${path} failed with ${res.status}`, body);
  }
  return (await res.json()) as T;
}

// ─── Signal domain ───────────────────────────────────────────────────────────

// 2026-05-20 — schema adapter post P1 RLS fix.
// Backend `/v1/signals/latest` (post-Wave-31) returns:
//   { id: UUID, symbol, side, confluence_score (0-100), entry_price,
//     stop_loss, take_profits[], context, emitted_at, status, ... }
// Vps1Signal preserves the legacy FE-facing shape (pair, direction,
// confidence 0-1, take_profit single) for downstream consumers; the
// shape conversion happens inside getLatestSignals so callers don't
// need to know about the backend rename.
export interface Vps1Signal {
  id: string;
  pair: string;
  direction: 'BUY' | 'SELL';
  entry_type?: string;
  lot?: number;
  entry_price?: number;
  entry_price_hint?: number;
  stop_loss?: number | null;
  take_profit?: number | null;
  confidence?: number;
  reasoning?: string;
  indicator_snapshot?: Record<string, unknown>;
  indicator_snapshot_summary?: Record<string, unknown>;
  emitted_at: string;
  status?: string;
}

interface BackendSignalRaw {
  id: string;
  engine_id?: string;
  strategy_id?: string;
  symbol: string;
  side: 'buy' | 'sell' | 'BUY' | 'SELL';
  timeframe?: string;
  confluence_score?: number;
  entry_price?: number;
  stop_loss?: number | null;
  take_profits?: number[];
  context?: Record<string, unknown>;
  emitted_at: string;
  status?: string;
  // legacy fallback when backend hasn't rolled the new schema yet
  pair?: string;
  direction?: 'BUY' | 'SELL';
  confidence?: number;
  take_profit?: number | null;
  reasoning?: string;
  indicator_snapshot?: Record<string, unknown>;
  entry_type?: string;
  lot?: number;
}

function adaptBackendSignal(raw: BackendSignalRaw): Vps1Signal {
  const pair = raw.pair ?? raw.symbol;
  const direction: 'BUY' | 'SELL' =
    raw.direction ?? (String(raw.side).toUpperCase() === 'SELL' ? 'SELL' : 'BUY');
  // Backend confluence_score is 0-100; FE legacy `confidence` is 0-1.
  // Normalise to 0-1 so existing `min_confidence: 0.7` filters and
  // SignalAuditLog.confidence (NUMERIC 0-1) keep working.
  const rawConf = raw.confidence ?? raw.confluence_score;
  const confidence =
    rawConf == null
      ? undefined
      : rawConf > 1
        ? rawConf / 100
        : rawConf;
  const tp = raw.take_profit ?? (Array.isArray(raw.take_profits) ? raw.take_profits[0] ?? null : null);
  const reasoning =
    raw.reasoning ??
    (typeof raw.context === 'object' && raw.context !== null
      ? typeof (raw.context as { reason?: unknown }).reason === 'string'
        ? ((raw.context as { reason: string }).reason)
        : undefined
      : undefined);
  return {
    id: String(raw.id),
    pair,
    direction,
    entry_type: raw.entry_type ?? raw.strategy_id,
    lot: raw.lot,
    entry_price: raw.entry_price,
    stop_loss: raw.stop_loss,
    take_profit: tp,
    confidence,
    reasoning,
    indicator_snapshot: raw.indicator_snapshot ?? raw.context,
    emitted_at: raw.emitted_at,
    status: raw.status,
  };
}

export async function getLatestSignals(params: {
  since_id?: bigint | number | string;
  limit?: number;
  min_confidence?: number;
  pair?: string;
} = {}): Promise<Vps1Signal[]> {
  // Backend `/v1/signals/latest` accepts: symbol (3-16 char), limit (1-200, default 50).
  // No since_id / min_confidence on canonical path; we do a client-side filter
  // post-fetch when caller supplies those (graceful fallback so existing callers
  // do not break while we migrate to /v1/signals/history with cursor).
  const q = new URLSearchParams();
  if (params.limit !== undefined) q.set('limit', String(params.limit));
  if (params.pair) q.set('symbol', params.pair);
  const qs = q.toString();
  const raw = await request<
    BackendSignalRaw[] | { items: BackendSignalRaw[]; count?: number; next_cursor?: string | null }
  >('signals', `/v1/signals/latest${qs ? `?${qs}` : ''}`);
  const rawItems: BackendSignalRaw[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.items)
      ? raw.items
      : [];
  let items: Vps1Signal[] = rawItems.map(adaptBackendSignal);

  if (params.since_id !== undefined) {
    // Backend IDs are UUIDv7 strings (lexicographically sortable by emission).
    // since_id supports either UUID string OR legacy bigint — compare as strings
    // when both sides look like UUIDs; otherwise fall back to bigint compare.
    const sinceStr = String(params.since_id);
    items = items.filter((s) => {
      if (sinceStr.includes('-')) return s.id > sinceStr;
      try {
        return BigInt(s.id) > BigInt(sinceStr);
      } catch {
        return true;
      }
    });
  }
  if (params.min_confidence !== undefined) {
    const min = params.min_confidence;
    items = items.filter((s) => {
      const c = typeof s.confidence === 'number' ? s.confidence : 0;
      return c >= min;
    });
  }
  return items;
}

// ─── Trade events domain ─────────────────────────────────────────────────────

export interface Vps1TradeEvent {
  sequence_number: number;
  event_type: 'OPEN' | 'MODIFY_SL' | 'MODIFY_TP' | 'CLOSE' | 'REVERSE';
  trade_id: number;
  ticket: number;
  pair: string;
  direction: 'BUY' | 'SELL';
  lot: number;
  price: number;
  stop_loss?: number | null;
  take_profit?: number | null;
  profit_usd?: number | null;
  close_reason?: string | null;
  confidence?: number | null;
  reasoning?: string | null;
  indicator_snapshot?: Record<string, unknown>;
  emitted_at: string;
}

export function getPendingTradeEvents(limit = 50) {
  return request<Vps1TradeEvent[]>('trade_events', `/api/trade-events/pending?limit=${limit}`);
}

export function ackTradeEvents(sequence_numbers: number[]) {
  return request<{ acknowledged: number }>('trade_events', `/api/trade-events/ack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sequence_numbers }),
  });
}

// ─── Research domain ─────────────────────────────────────────────────────────

export interface Vps1ResearchItem {
  id: number;
  pair: string;
  confidence: number;
  direction?: string;
  reasoning: string;
  indicator_snapshot?: Record<string, unknown>;
  emitted_at: string;
  [key: string]: unknown;
}

/**
 * NOTE 2026-05-18 — `/api/research/*` endpoints were retired from the
 * forex backend (port 8101). They previously served as a gateway
 * aggregating substrate + indicators + signals output; equivalent data
 * now lives across 821x microservices (signals 8211, indicators 8212,
 * substrate/key-levels 8220, calendar 8215). Until VPS1 SSH `permitopen`
 * is extended to include those ports, the calls below 404 from VPS3.
 *
 * Behavior: returns empty payload on 404 so research UI renders an
 * "awaiting data" empty state instead of crashing. Other status codes
 * still throw Vps1Error.
 */
async function tolerate404<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    if (err instanceof Vps1Error && err.status === 404) {
      return fallback;
    }
    throw err;
  }
}

export function getLatestResearch(limit = 20): Promise<Vps1ResearchItem[]> {
  return tolerate404(
    request<Vps1ResearchItem[]>('research', `/api/research/latest?limit=${limit}`),
    [],
  );
}

export function getTopSignals(hours = 24, limit = 10): Promise<Vps1ResearchItem[]> {
  return tolerate404(
    request<Vps1ResearchItem[]>('research', `/api/research/top-signals?hours=${hours}&limit=${limit}`),
    [],
  );
}

export interface Vps1WeeklyRecap {
  week_start: string;
  week_end: string;
  total_signals: number;
  top_pair?: string;
  avg_confidence?: number;
  highlights?: Array<{ pair: string; summary: string }>;
  markdown?: string;
  [key: string]: unknown;
}

const EMPTY_RECAP: Vps1WeeklyRecap = {
  week_start: '',
  week_end: '',
  total_signals: 0,
  highlights: [],
};

export function getWeeklyRecap(): Promise<Vps1WeeklyRecap> {
  return tolerate404(
    request<Vps1WeeklyRecap>('research', `/api/research/weekly-recap`),
    EMPTY_RECAP,
  );
}

// ─── Tenant positions domain (Wave-29S-D) ───────────────────────────────────
// Migrasi dari legacy /api/pamm/* (deprecated 2026-04-26) ke canonical
// /api/forex/positions* yang menghidrasi unrealized_pnl_quote real-time.

export interface CanonicalPositionView {
  id: string;
  engine_id?: string;
  strategy_id?: string;
  symbol: string;
  side: 'buy' | 'sell';
  volume_initial?: number | string;
  volume_remaining?: number | string;
  entry_price?: number | string;
  sl_price?: number | string | null;
  tp_ladder?: Array<{ level?: number | string; ratio?: number | string }>;
  status: 'open' | 'partial' | 'closed';
  opened_at?: string;
  closed_at?: string | null;
  close_reason?: string | null;
  unrealized_pnl_quote?: number | string;
  gross_pnl?: number | string;
  net_pnl_quote?: number | string;
}

export function getOpenPositions(limit = 200) {
  return request<{ data: CanonicalPositionView[]; pagination?: unknown }>(
    'tenant',
    `/api/forex/positions?status=open&limit=${limit}`,
  );
}

export function getClosedTrades(limit = 100, cursor?: string) {
  const qs = new URLSearchParams({ status: 'closed', limit: String(limit) });
  if (cursor) qs.set('cursor', cursor);
  return request<{ data: CanonicalPositionView[]; pagination?: { next_cursor: string | null } }>(
    'tenant',
    `/api/forex/positions?${qs}`,
  );
}

export function getPositionStats(period: '1d' | '7d' | '30d' | '90d' | 'all' = '30d') {
  return request<Record<string, unknown>>('tenant', `/api/forex/positions/stats?period=${period}`);
}

// ─── Stats domain ────────────────────────────────────────────────────────────

export interface Vps1PerformanceStats {
  period_days: number;
  total_trades: number;
  win_rate?: number;
  profit_factor?: number;
  sharpe_ratio?: number;
  max_drawdown?: number;
  avg_hold_minutes?: number;
  equity_curve?: Array<{ date: string; equity: number }>;
  [key: string]: unknown;
}

const EMPTY_PERFORMANCE: Vps1PerformanceStats = {
  period_days: 0,
  total_trades: 0,
};

export function getPerformanceStats(period_days = 30): Promise<Vps1PerformanceStats> {
  return tolerate404(
    request<Vps1PerformanceStats>('stats', `/api/stats/performance?period_days=${period_days}`),
    { ...EMPTY_PERFORMANCE, period_days },
  );
}

// ─── Research: Dedicated Pair Endpoints ─────────────────────────────────────
//
// Shapes below mirror the real VPS1 payloads observed on 2026-04-19. VPS1
// returns rich per-timeframe data but the field names are domain-specific
// (Wyckoff / SMC / Quasimodo) rather than generic TA terms. Types are
// deliberately loose on secondary fields so extraction can use what is
// present and skip what is not.

export interface Vps1Price {
  bid?: number;
  ask?: number;
  mid?: number;
  spread_points?: number;
  point_size?: number;
}

export interface Vps1MultiTfAtr {
  m5?: number;
  m15?: number;
  h1?: number;
  h4?: number;
  d1?: number;
  regime?: string;
}

export interface Vps1SessionInfo {
  profile?: string;
  profile_label?: string;
  market_open?: boolean;
  scan_allowed?: boolean;
  active_window?: string;
  next_window?: string;
  utc_hour?: number;
}

export interface Vps1Scanner {
  score?: number;
  volatility?: number;
  spread_quality?: number;
  mtf_confluence?: number;
  higher_tf_bias?: number;
  smc_score?: number;
  wyckoff_score?: number;
  zone_score?: number;
  sr_score?: number;
  session_score?: number;
  reason?: string;
  reason_label?: string;
  reason_detail?: string;
  [key: string]: unknown;
}

export interface Vps1MarketSnapshot {
  pair: string;
  timestamp_utc: string;
  engine_running?: boolean;
  price?: Vps1Price;
  atr?: Vps1MultiTfAtr;
  session?: Vps1SessionInfo;
  scanner?: Vps1Scanner;
  [key: string]: unknown;
}

/**
 * 2026-05-19 — migrated dari /api/research/market-snapshot (deprecated)
 * ke composite call ke 8220 substrate microservice. Backward-compatible
 * shape (Vps1MarketSnapshot) preserved — fields kosong jika substrate
 * microservice unreachable.
 */
export async function getMarketSnapshot(pair: string): Promise<Vps1MarketSnapshot> {
  const keyLevelsFallback: Vps1KeyLevels = { symbol: pair };
  const sessionFallback: Vps1SessionStatus = { symbol: pair };
  const [keyLevels, session] = await Promise.all([
    getKeyLevels(pair).catch((): Vps1KeyLevels => keyLevelsFallback),
    getActiveSession(pair).catch((): Vps1SessionStatus => sessionFallback),
  ]);
  return {
    pair,
    timestamp_utc: new Date().toISOString(),
    session: {
      profile: session.active_session,
      next_window: session.next_session,
      utc_hour: typeof session.utc_hour === 'number' ? session.utc_hour : undefined,
    },
    // Carry the raw substrate payload so consumers that want to render
    // levels / zones bisa pull dari `(snapshot as any).key_levels`.
    key_levels: keyLevels.levels ?? [],
    daily_pivot: keyLevels.daily_pivot,
    weekly_pivot: keyLevels.weekly_pivot,
  };
}

export interface Vps1CalendarEvent {
  time: string;
  currency: string;
  event: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  forecast?: string;
  previous?: string;
  actual?: string;
  [key: string]: unknown;
}

export interface Vps1Calendar {
  pair: string;
  events: Vps1CalendarEvent[];
  [key: string]: unknown;
}

/**
 * 2026-05-19 — migrated dari /api/research/calendar/{pair} (deprecated)
 * ke /v1/calendar/events?symbol=X di port 8215. Normalises new envelope
 * shape ({items: [...]} or [...]) to legacy `{pair, events}` shape.
 */
export async function getCalendar(pair: string): Promise<Vps1Calendar> {
  const raw = await getCalendarEvents({ symbol: pair, limit: 20 });
  const items = Array.isArray(raw) ? raw : (raw as { items: Vps1CalendarEventV1[] }).items ?? [];
  return {
    pair,
    events: items.map((ev) => ({
      time: ev.time ?? '',
      currency: ev.currency ?? pair.slice(0, 3),
      event: ev.event ?? '',
      impact: (ev.impact ?? 'LOW') as 'HIGH' | 'MEDIUM' | 'LOW',
      forecast: ev.forecast,
      previous: ev.previous,
      actual: ev.actual,
    })),
  };
}

/**
 * Single-timeframe indicator payload. VPS1 emits ~80 fields per TF; we only
 * type the ones we read so the rest stays addressable via the index signature.
 */
export interface Vps1TimeframeIndicators {
  timeframe?: string;
  atr?: number;
  // Wyckoff
  wyckoff_phase?: string;
  wyckoff_event?: string;
  wyckoff_conf?: number;
  wyckoff_tr_high?: number;
  wyckoff_tr_low?: number;
  // Quasimodo
  quasimodo_pattern?: string;
  quasimodo_confidence?: number;
  quasimodo_level?: number;
  quasimodo_break_level?: number;
  // SMC / structure
  market_structure?: string;
  last_bos?: string;
  last_choch?: string;
  // Nearest levels (single scalars)
  nearest_support?: number;
  nearest_resistance?: number;
  // Nearest zones (top/bottom pair)
  nearest_demand_top?: number;
  nearest_demand_bottom?: number;
  nearest_demand_strength?: number;
  nearest_supply_top?: number;
  nearest_supply_bottom?: number;
  nearest_supply_strength?: number;
  // Swings
  swing_high_1?: number;
  swing_high_2?: number;
  swing_low_1?: number;
  swing_low_2?: number;
  // Targets
  bullish_target?: number;
  bullish_target_type?: string;
  bearish_target?: number;
  bearish_target_type?: string;
  // Fair Value Gaps
  nearest_fvg_bull_top?: number;
  nearest_fvg_bull_bottom?: number;
  nearest_fvg_bear_top?: number;
  nearest_fvg_bear_bottom?: number;
  [key: string]: unknown;
}

export interface Vps1TechnicalAnalysis {
  pair: string;
  timestamp_utc: string;
  price?: Vps1Price;
  timeframes: Record<string, Vps1TimeframeIndicators>;
  smc_execution?: Record<string, unknown>;
  liquidity?: Record<string, unknown>;
  [key: string]: unknown;
}

export function getTechnicalAnalysis(pair: string): Promise<Vps1TechnicalAnalysis> {
  return tolerate404(
    request<Vps1TechnicalAnalysis>('research', `/api/research/technical-analysis/${pair}`),
    { pair, timestamp_utc: new Date().toISOString(), timeframes: {} },
  );
}

export interface Vps1FibLevel {
  ratio: number;
  price: number;
  label: string;
  role: 'support' | 'resistance' | 'target' | string;
}

export interface Vps1FibTimeframe {
  trend?: string;
  swing_low?: number;
  swing_high?: number;
  retracements?: Vps1FibLevel[];
  extensions?: Vps1FibLevel[];
}

export interface Vps1TechnicalExtras {
  pair: string;
  timestamp_utc: string;
  fibonacci?: Record<string, Vps1FibTimeframe>;
  [key: string]: unknown;
}

export function getTechnicalExtras(pair: string): Promise<Vps1TechnicalExtras> {
  return tolerate404(
    request<Vps1TechnicalExtras>('research', `/api/research/technical-extras/${pair}`),
    { pair, timestamp_utc: new Date().toISOString() },
  );
}

// ─── Public API Marketplace microservices (2026-05-19) ─────────────────────
// Direct calls ke /v1/* di port 821x. Setiap scope punya dedicated
// X-Api-Key + URL via env. Backend confirmed 600/min + 1M/day rate.

export interface Vps1KeyLevel {
  level: number;
  kind?: string;
  strength?: number;
  timeframe?: string;
  source?: string;
  [key: string]: unknown;
}

export interface Vps1KeyLevels {
  symbol: string;
  generated_at?: string;
  levels?: Vps1KeyLevel[];
  daily_pivot?: number;
  weekly_pivot?: number;
  [key: string]: unknown;
}

export function getKeyLevels(symbol: string): Promise<Vps1KeyLevels> {
  return tolerate404(
    request<Vps1KeyLevels>('substrate', `/v1/key-levels/${encodeURIComponent(symbol)}`),
    { symbol },
  );
}

export interface Vps1SubstrateZone {
  type?: string;
  high?: number;
  low?: number;
  timeframe?: string;
  strength?: number;
  [key: string]: unknown;
}

export interface Vps1SubstrateZones {
  symbol: string;
  zones?: Vps1SubstrateZone[];
  [key: string]: unknown;
}

export function getSubstrateZones(symbol: string): Promise<Vps1SubstrateZones> {
  return tolerate404(
    request<Vps1SubstrateZones>('substrate', `/v1/substrate/zones/${encodeURIComponent(symbol)}`),
    { symbol, zones: [] },
  );
}

export interface Vps1SessionStatus {
  symbol: string;
  active_session?: string;
  next_session?: string;
  utc_hour?: number;
  [key: string]: unknown;
}

export function getActiveSession(symbol: string): Promise<Vps1SessionStatus> {
  return tolerate404(
    request<Vps1SessionStatus>('substrate', `/v1/sessions/${encodeURIComponent(symbol)}/active`),
    { symbol },
  );
}

export interface Vps1NewsArticle {
  id?: string;
  title?: string;
  source?: string;
  url?: string;
  sentiment?: number;
  published_at?: string;
  [key: string]: unknown;
}

export function getNewsArticles(params: { limit?: number; symbol?: string } = {}): Promise<{ items: Vps1NewsArticle[] } | Vps1NewsArticle[]> {
  const q = new URLSearchParams();
  if (params.limit !== undefined) q.set('limit', String(params.limit));
  if (params.symbol) q.set('symbol', params.symbol);
  const qs = q.toString();
  return tolerate404(
    request<{ items: Vps1NewsArticle[] } | Vps1NewsArticle[]>('news', `/v1/news/articles${qs ? `?${qs}` : ''}`),
    { items: [] },
  );
}

export interface Vps1CalendarEventV1 {
  time?: string;
  symbol?: string;
  currency?: string;
  event?: string;
  impact?: 'HIGH' | 'MEDIUM' | 'LOW';
  forecast?: string;
  previous?: string;
  actual?: string;
  [key: string]: unknown;
}

export function getCalendarEvents(params: { symbol?: string; limit?: number } = {}): Promise<{ items: Vps1CalendarEventV1[] } | Vps1CalendarEventV1[]> {
  const q = new URLSearchParams();
  if (params.symbol) q.set('symbol', params.symbol);
  if (params.limit !== undefined) q.set('limit', String(params.limit));
  const qs = q.toString();
  return tolerate404(
    request<{ items: Vps1CalendarEventV1[] } | Vps1CalendarEventV1[]>('calendar', `/v1/calendar/events${qs ? `?${qs}` : ''}`),
    { items: [] },
  );
}

export interface Vps1MarketBar {
  time?: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  [key: string]: unknown;
}

export function getMarketBars(symbol: string, params: { timeframe?: string; limit?: number } = {}): Promise<{ bars: Vps1MarketBar[] } | Vps1MarketBar[]> {
  const q = new URLSearchParams();
  if (params.timeframe) q.set('timeframe', params.timeframe);
  if (params.limit !== undefined) q.set('limit', String(params.limit));
  const qs = q.toString();
  return tolerate404(
    request<{ bars: Vps1MarketBar[] } | Vps1MarketBar[]>('market_data', `/v1/market-data/bars/${encodeURIComponent(symbol)}${qs ? `?${qs}` : ''}`),
    { bars: [] },
  );
}

export interface Vps1IndicatorDef {
  name: string;
  params?: string[];
  description?: string;
  [key: string]: unknown;
}

export function getIndicators(): Promise<{ items: Vps1IndicatorDef[] } | Vps1IndicatorDef[]> {
  return tolerate404(
    request<{ items: Vps1IndicatorDef[] } | Vps1IndicatorDef[]>('indicators', `/v1/indicators`),
    { items: [] },
  );
}

export interface Vps1AiAdvice {
  signal_id?: string;
  symbol?: string;
  direction?: string;
  rationale?: string;
  confidence?: number;
  key_factors?: string[];
  created_at?: string;
  [key: string]: unknown;
}

export function getAiExplainAdvice(params: { limit?: number; symbol?: string } = {}): Promise<{ items: Vps1AiAdvice[] } | Vps1AiAdvice[]> {
  const q = new URLSearchParams();
  if (params.limit !== undefined) q.set('limit', String(params.limit));
  if (params.symbol) q.set('symbol', params.symbol);
  const qs = q.toString();
  return tolerate404(
    request<{ items: Vps1AiAdvice[] } | Vps1AiAdvice[]>('ai_explain', `/v1/ai-explain/advice${qs ? `?${qs}` : ''}`),
    { items: [] },
  );
}

export interface Vps1AiKellyEntry {
  symbol?: string;
  kelly_fraction?: number;
  recommended_size?: number;
  win_rate?: number;
  payoff?: number;
  [key: string]: unknown;
}

export function getAiExplainKelly(params: { symbol?: string } = {}): Promise<{ items: Vps1AiKellyEntry[] } | Vps1AiKellyEntry[]> {
  const q = new URLSearchParams();
  if (params.symbol) q.set('symbol', params.symbol);
  const qs = q.toString();
  return tolerate404(
    request<{ items: Vps1AiKellyEntry[] } | Vps1AiKellyEntry[]>('ai_explain', `/v1/ai-explain/kelly${qs ? `?${qs}` : ''}`),
    { items: [] },
  );
}

export interface Vps1AiObservation {
  id?: string;
  observation?: string;
  outcome?: string;
  confidence?: number;
  created_at?: string;
  [key: string]: unknown;
}

export function getAiExplainObservations(params: { limit?: number } = {}): Promise<{ items: Vps1AiObservation[] } | Vps1AiObservation[]> {
  const q = new URLSearchParams();
  if (params.limit !== undefined) q.set('limit', String(params.limit));
  const qs = q.toString();
  return tolerate404(
    request<{ items: Vps1AiObservation[] } | Vps1AiObservation[]>('ai_explain', `/v1/ai-explain/observations${qs ? `?${qs}` : ''}`),
    { items: [] },
  );
}

// ─── Health ──────────────────────────────────────────────────────────────────

export async function getHealth(): Promise<{ ok: boolean; latencyMs: number; body?: unknown; error?: string }> {
  const start = Date.now();
  try {
    const res = await fetch(`${forexBaseUrl()}/health`, {
      signal: AbortSignal.timeout(5_000),
      cache: 'no-store',
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, latencyMs: Date.now() - start, body };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : 'unknown' };
  }
}
