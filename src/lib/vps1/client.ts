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

export interface Vps1MarketSnapshot {
  pair: string;
  current_price: number;
  price_change_24h: number;
  price_change_pct: number;
  high_24h: number;
  low_24h: number;
  volume_24h?: number;
  spread?: number;
  atr_daily?: number;
  session_info?: {
    current_session: string;
    session_open: number;
    prev_high: number;
    prev_low: number;
    current_high: number;
    current_low: number;
  };
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

export interface Vps1TimeframeIndicators {
  tf: string;
  trend: string;
  rsi: number;
  macd_signal: string;
  bb_position: string;
  ema_alignment: string;
  key_levels: {
    support: number[];
    resistance: number[];
  };
  snd_zones: Array<{ type: string; high: number; low: number }>;
  patterns: Array<{ name: string; description: string }>;
  [key: string]: unknown;
}

export interface Vps1TechnicalAnalysis {
  pair: string;
  timeframes: Record<string, Vps1TimeframeIndicators>;
  multi_tf_confluence: {
    score: number;
    dominant_bias: string;
    aligned_timeframes: string[];
  };
  [key: string]: unknown;
}

export function getTechnicalAnalysis(pair: string) {
  return request<Vps1TechnicalAnalysis>('research', `/api/research/technical-analysis/${pair}`);
}

export interface Vps1LiquidityPool {
  level: number;
  type: string;
  strength: number;
  [key: string]: unknown;
}

export interface Vps1SessionLevels {
  prev_high: number;
  prev_low: number;
  current_high: number;
  current_low: number;
  at_session_level: boolean;
  [key: string]: unknown;
}

export interface Vps1TechnicalExtras {
  pair: string;
  liquidity_pools: Vps1LiquidityPool[];
  session_levels: Vps1SessionLevels;
  order_flow_bias?: string;
  institutional_levels?: number[];
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
