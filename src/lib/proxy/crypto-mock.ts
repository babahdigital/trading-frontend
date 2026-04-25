/**
 * Crypto backend mock data — shape-accurate per
 * `D:\Data\Projek\trading-crypto\docs\API_FRONTEND_REFERENCE.md` Sprint X+1.2.
 *
 * Used when CRYPTO_BACKEND_URL belum dikonfigurasi atau backend down.
 * UI HARUS tampilkan badge "data preview" saat `source: 'mock'`.
 */

const NOW = () => new Date();
const MINUTES_AGO = (m: number) => new Date(Date.now() - m * 60 * 1000).toISOString();

export interface MockOverview {
  tenant_id: number;
  babahalgo_user_id: string;
  subscription_tier: string;
  status: string;
  notification_lang: 'id' | 'en';
  telegram_bound: boolean;
  open_positions_count: number;
  closing_positions_count: number;
  latest_equity_usdt: string;
  latest_available_balance: string;
  latest_equity_recorded_at: string;
  realized_pnl_24h_usdt: string;
  trades_24h_count: number;
  risk_profile_max_leverage: number;
  risk_profile_risk_per_trade_pct: string;
  kill_switch_active: boolean;
}

export interface MockEquityPoint {
  recorded_at: string;
  total_equity_usdt: string;
  available_balance: string;
  total_margin: string;
  unrealized_pnl: string;
  open_positions_count: number;
}

export interface MockPosition {
  id: number;
  tenant_id: number;
  symbol: string;
  market_type: 'spot' | 'futures';
  side: 'LONG' | 'SHORT';
  status: 'open' | 'closing' | 'closed';
  entry_price: string;
  quantity: string;
  leverage: number;
  unrealized_pnl_usdt: string;
  sl_price: string | null;
  tp_price: string | null;
  liquidation_price: string | null;
  margin_usdt: string | null;
  strategy_name: string;
  opened_at: string;
  last_synced_at: string;
}

export interface MockTrade {
  id: number;
  tenant_id: number;
  symbol: string;
  market_type: 'spot' | 'futures';
  side: 'LONG' | 'SHORT';
  quantity: string;
  entry_price: string;
  exit_price: string;
  leverage: number;
  realized_pnl_usdt: string;
  commission_usdt: string;
  funding_paid_usdt: string;
  net_pnl_usdt: string;
  duration_seconds: number;
  opened_at: string;
  closed_at: string;
  close_reason: string;
  strategy_name: string;
}

export interface MockSignal {
  id: number;
  symbol: string;
  market_type: 'spot' | 'futures';
  strategy_name: string;
  direction: 'bullish' | 'bearish';
  entry_price: string;
  sl_price: string;
  tp_price: string;
  confidence: string;
  risk_reward_ratio: string;
  generated_at: string;
  outcome: string;
}

export interface MockStrategy {
  strategy_name: string;
  market_type: 'spot' | 'futures';
  enabled: boolean;
}

export interface MockLeverage {
  user_leverage_override: number | null;
  ai_suggestion: number | null;
  effective: number;
}

export interface MockKeysMetadata {
  vault_path: string | null;
  last_verified_at: string | null;
  permissions: { canRead: boolean; canTrade: boolean; canWithdraw: boolean };
  ip_whitelist: string[] | null;
}

export interface MockTelegram {
  tenant_id: number;
  notification_lang: 'id' | 'en';
  telegram_bound: boolean;
  chat_id: string | null;
}

export function mockOverview(): MockOverview {
  return {
    tenant_id: 1,
    babahalgo_user_id: 'demo-001',
    subscription_tier: 'Pro',
    status: 'active',
    notification_lang: 'id',
    telegram_bound: false,
    open_positions_count: 2,
    closing_positions_count: 0,
    latest_equity_usdt: '5060.12641672',
    latest_available_balance: '1340.50000000',
    latest_equity_recorded_at: NOW().toISOString(),
    realized_pnl_24h_usdt: '194.91000000',
    trades_24h_count: 5,
    risk_profile_max_leverage: 10,
    risk_profile_risk_per_trade_pct: '1.00',
    kill_switch_active: false,
  };
}

export function mockEquityHistory(limit = 288): MockEquityPoint[] {
  const cap = Math.min(Math.max(limit, 1), 2880);
  let eq = 5000;
  return Array.from({ length: cap }, (_, i) => {
    eq += (Math.sin(i / 12) + 0.4) * 4;
    const margin = (Math.cos(i / 8) * 100 + 200).toFixed(8);
    const unrealized = (Math.cos(i / 6) * 12).toFixed(8);
    return {
      recorded_at: new Date(Date.now() - (cap - i) * 5 * 60 * 1000).toISOString(),
      total_equity_usdt: eq.toFixed(8),
      available_balance: (eq - parseFloat(margin)).toFixed(8),
      total_margin: margin,
      unrealized_pnl: unrealized,
      open_positions_count: i % 4 === 0 ? 0 : 2,
    };
  });
}

export function mockPositions(): MockPosition[] {
  return [
    {
      id: 1,
      tenant_id: 1,
      symbol: 'BTCUSDT',
      market_type: 'futures',
      side: 'LONG',
      status: 'open',
      entry_price: '64200.50000000',
      quantity: '0.01200000',
      leverage: 5,
      unrealized_pnl_usdt: '18.42000000',
      sl_price: '63800.00000000',
      tp_price: '65000.00000000',
      liquidation_price: '51360.00000000',
      margin_usdt: '154.08000000',
      strategy_name: 'scalping_momentum',
      opened_at: MINUTES_AGO(45),
      last_synced_at: MINUTES_AGO(0.2),
    },
    {
      id: 2,
      tenant_id: 1,
      symbol: 'ETHUSDT',
      market_type: 'futures',
      side: 'SHORT',
      status: 'open',
      entry_price: '3215.80000000',
      quantity: '0.50000000',
      leverage: 3,
      unrealized_pnl_usdt: '-5.97000000',
      sl_price: '3260.00000000',
      tp_price: '3140.00000000',
      liquidation_price: '4287.00000000',
      margin_usdt: '535.97000000',
      strategy_name: 'swing_smc',
      opened_at: MINUTES_AGO(120),
      last_synced_at: MINUTES_AGO(0.2),
    },
  ];
}

export function mockTrades(): MockTrade[] {
  const closeReasons = ['tp', 'sl', 'manual_api', 'tp', 'tp'];
  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'AVAXUSDT'];
  const strategies = ['scalping_momentum', 'swing_smc', 'wyckoff_breakout'];
  return Array.from({ length: 5 }, (_, i) => {
    const isWin = closeReasons[i] === 'tp';
    const entry = [64200, 3215, 145, 580, 38][i];
    const exit = isWin ? entry * 1.012 : entry * 0.992;
    const qty = [0.01, 0.4, 5, 1, 12][i];
    const realized = (exit - entry) * qty;
    const commission = Math.abs(realized) * 0.04;
    return {
      id: 100 + i,
      tenant_id: 1,
      symbol: symbols[i],
      market_type: i % 2 === 0 ? 'futures' : 'spot',
      side: 'LONG',
      quantity: qty.toFixed(8),
      entry_price: entry.toFixed(8),
      exit_price: exit.toFixed(8),
      leverage: i % 2 === 0 ? 5 : 1,
      realized_pnl_usdt: realized.toFixed(8),
      commission_usdt: commission.toFixed(8),
      funding_paid_usdt: '0.00000000',
      net_pnl_usdt: (realized - commission).toFixed(8),
      duration_seconds: 1800 + i * 600,
      opened_at: MINUTES_AGO(60 * (i + 2)),
      closed_at: MINUTES_AGO(60 * (i + 1)),
      close_reason: closeReasons[i],
      strategy_name: strategies[i % strategies.length],
    };
  });
}

export function mockSignals(): MockSignal[] {
  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT', 'BNBUSDT'];
  const strategies = ['scalping_momentum', 'swing_smc', 'wyckoff_breakout'];
  return Array.from({ length: 10 }, (_, i) => {
    const direction: 'bullish' | 'bearish' = i % 2 === 0 ? 'bullish' : 'bearish';
    const entry = [64000, 3200, 145, 38, 580][i % 5];
    return {
      id: 1000 + i,
      symbol: symbols[i % symbols.length],
      market_type: i % 3 === 0 ? 'spot' : 'futures',
      strategy_name: strategies[i % strategies.length],
      direction,
      entry_price: entry.toFixed(8),
      sl_price: (direction === 'bullish' ? entry * 0.99 : entry * 1.01).toFixed(8),
      tp_price: (direction === 'bullish' ? entry * 1.02 : entry * 0.98).toFixed(8),
      confidence: (0.7 + (i % 3) * 0.08).toFixed(2),
      risk_reward_ratio: (2 + (i % 3) * 0.5).toFixed(2),
      generated_at: MINUTES_AGO(15 * (i + 1)),
      outcome: i < 2 ? 'pending' : i < 6 ? 'executed' : 'expired',
    };
  });
}

export function mockStrategies(): MockStrategy[] {
  return [
    { strategy_name: 'scalping_momentum', market_type: 'futures', enabled: true },
    { strategy_name: 'swing_smc', market_type: 'futures', enabled: true },
    { strategy_name: 'spot_dca_trend', market_type: 'spot', enabled: false },
  ];
}

export function mockLeverage(): MockLeverage {
  return {
    user_leverage_override: null,
    ai_suggestion: 5,
    effective: 5,
  };
}

export function mockKeysMetadata(): MockKeysMetadata {
  return {
    vault_path: null,
    last_verified_at: null,
    permissions: { canRead: false, canTrade: false, canWithdraw: false },
    ip_whitelist: null,
  };
}

export function mockTelegram(): MockTelegram {
  return {
    tenant_id: 1,
    notification_lang: 'id',
    telegram_bound: false,
    chat_id: null,
  };
}
