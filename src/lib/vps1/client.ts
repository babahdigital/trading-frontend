/**
 * VPS1 commercial API client.
 *
 * Supports scoped tokens (signals, trade_events, research, pamm, stats) with a
 * single admin-token fallback. Scope tokens are read from env vars at call
 * time so .env changes on the server do not require code changes.
 */

type Scope = 'signals' | 'trade_events' | 'research' | 'pamm' | 'stats' | 'admin';

const SCOPE_ENV: Record<Scope, string> = {
  signals: 'VPS1_TOKEN_SIGNALS',
  trade_events: 'VPS1_TOKEN_TRADE_EVENTS',
  research: 'VPS1_TOKEN_RESEARCH',
  pamm: 'VPS1_TOKEN_PAMM',
  stats: 'VPS1_TOKEN_STATS',
  admin: 'VPS1_ADMIN_TOKEN',
};

function tokenFor(scope: Scope): string | undefined {
  return process.env[SCOPE_ENV[scope]] || process.env.VPS1_ADMIN_TOKEN || undefined;
}

function baseUrl(): string {
  return process.env.VPS1_BACKEND_URL || 'http://127.0.0.1:18000';
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
  const url = `${baseUrl()}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...Object.fromEntries(new Headers(init.headers as HeadersInit || {}).entries()),
      'X-API-Token': token,
      'User-Agent': 'babahalgo-vps2/1.0',
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

export interface Vps1Signal {
  id: number;
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
}

export function getLatestSignals(params: {
  since_id?: bigint | number;
  limit?: number;
  min_confidence?: number;
  pair?: string;
} = {}) {
  const q = new URLSearchParams();
  if (params.since_id !== undefined) q.set('since_id', String(params.since_id));
  if (params.limit !== undefined) q.set('limit', String(params.limit));
  if (params.min_confidence !== undefined) q.set('min_confidence', String(params.min_confidence));
  if (params.pair) q.set('pair', params.pair);
  const qs = q.toString();
  return request<Vps1Signal[]>('signals', `/api/signals/latest${qs ? `?${qs}` : ''}`);
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

export function getLatestResearch(limit = 20) {
  return request<Vps1ResearchItem[]>('research', `/api/research/latest?limit=${limit}`);
}

export function getTopSignals(hours = 24, limit = 10) {
  return request<Vps1ResearchItem[]>('research', `/api/research/top-signals?hours=${hours}&limit=${limit}`);
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

export function getWeeklyRecap() {
  return request<Vps1WeeklyRecap>('research', `/api/research/weekly-recap`);
}

// ─── PAMM domain ─────────────────────────────────────────────────────────────

export function getPammStatus() {
  return request<Record<string, unknown>>('pamm', `/api/pamm/master-status`);
}

export function getPammEquityCurve(days = 30) {
  return request<Array<{ date: string; equity: number }>>('pamm', `/api/pamm/master-equity-curve?days=${days}`);
}

export function getPammTradeHistory(reliable_only = true, limit = 100) {
  return request<Array<Record<string, unknown>>>('pamm', `/api/pamm/trade-history?reliable_only=${reliable_only}&limit=${limit}`);
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

export function getPerformanceStats(period_days = 30) {
  return request<Vps1PerformanceStats>('stats', `/api/stats/performance?period_days=${period_days}`);
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

export function getMarketSnapshot(pair: string) {
  return request<Vps1MarketSnapshot>('research', `/api/research/market-snapshot/${pair}`);
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

export function getCalendar(pair: string) {
  return request<Vps1Calendar>('research', `/api/research/calendar/${pair}`);
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

export function getTechnicalAnalysis(pair: string) {
  return request<Vps1TechnicalAnalysis>('research', `/api/research/technical-analysis/${pair}`);
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

export function getTechnicalExtras(pair: string) {
  return request<Vps1TechnicalExtras>('research', `/api/research/technical-extras/${pair}`);
}

// ─── Health ──────────────────────────────────────────────────────────────────

export async function getHealth(): Promise<{ ok: boolean; latencyMs: number; body?: unknown; error?: string }> {
  const start = Date.now();
  try {
    const res = await fetch(`${baseUrl()}/health`, {
      signal: AbortSignal.timeout(5_000),
      cache: 'no-store',
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, latencyMs: Date.now() - start, body };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : 'unknown' };
  }
}
