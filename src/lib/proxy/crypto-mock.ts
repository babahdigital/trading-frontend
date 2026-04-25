/**
 * Crypto backend mock data — deterministic, schema-accurate placeholders that
 * let UI render meaningfully when CRYPTO_BACKEND_URL belum dikonfigurasi.
 *
 * All shapes mirror trading-crypto/docs/BABAHALGO_INTEGRATION.md Phase 5.
 * UI must show "data preview" banner ketika `source: 'mock'`.
 */

export interface MockPosition {
  id: number;
  symbol: string;
  market_type: 'spot' | 'futures';
  side: 'LONG' | 'SHORT';
  entry_price: number;
  quantity: number;
  leverage: number;
  unrealized_pnl_usdt: number;
  sl_price: number | null;
  tp_price: number | null;
  liquidation_price: number | null;
  margin_usdt: number | null;
  status: 'open' | 'closing';
  strategy_name: string;
  opened_at: string;
  last_synced_at: string;
}

export interface MockTrade {
  id: number;
  symbol: string;
  market_type: 'spot' | 'futures';
  side: 'LONG' | 'SHORT';
  quantity: number;
  entry_price: number;
  exit_price: number;
  leverage: number;
  realized_pnl_usdt: number;
  commission_usdt: number;
  funding_paid_usdt: number;
  net_pnl_usdt: number;
  duration_seconds: number;
  opened_at: string;
  closed_at: string;
  close_reason: 'tp' | 'sl' | 'manual' | 'kill_switch' | 'funding_exit';
  strategy_name: string;
}

export interface MockEquityPoint {
  recorded_at: string;
  total_equity_usdt: number;
  unrealized_pnl: number;
}

export interface MockSignal {
  id: number;
  symbol: string;
  market_type: 'spot' | 'futures';
  strategy_name: string;
  direction: 'bullish' | 'bearish';
  entry_price: number;
  sl_price: number;
  tp_price: number;
  confidence: number;
  risk_reward_ratio: number;
  generated_at: string;
  outcome: 'pending' | 'executed' | 'skipped' | 'expired';
}

export interface MockTradingStatus {
  equity_usdt: number;
  unrealized_pnl: number;
  open_positions_count: number;
  today_realized_pnl: number;
  kill_switch_active: boolean;
  last_signal_at: string | null;
}

export interface MockRiskProfile {
  max_leverage: number;
  max_concurrent_positions: number;
  max_daily_loss_usd: number;
  liquidation_buffer_atr: number;
  risk_per_trade_pct: number;
  kill_switch_active: boolean;
  loss_streak_threshold: number;
  loss_streak_cooldown_min: number;
}

export interface MockStrategy {
  name: string;
  display_name: string;
  description: string;
  min_tier: 'CRYPTO_BASIC' | 'CRYPTO_PRO' | 'CRYPTO_HNWI';
  market_types: ('spot' | 'futures')[];
  default_params: Record<string, unknown>;
}

const NOW = () => new Date();
const MINUTES_AGO = (m: number) => new Date(Date.now() - m * 60 * 1000).toISOString();

export function mockTradingStatus(): MockTradingStatus {
  return {
    equity_usdt: 1245.67,
    unrealized_pnl: 12.45,
    open_positions_count: 2,
    today_realized_pnl: 28.34,
    kill_switch_active: false,
    last_signal_at: MINUTES_AGO(8),
  };
}

export function mockPositions(): MockPosition[] {
  return [
    {
      id: 1,
      symbol: 'BTCUSDT',
      market_type: 'futures',
      side: 'LONG',
      entry_price: 64200.5,
      quantity: 0.012,
      leverage: 5,
      unrealized_pnl_usdt: 18.42,
      sl_price: 63800.0,
      tp_price: 65000.0,
      liquidation_price: 51360.0,
      margin_usdt: 154.08,
      status: 'open',
      strategy_name: 'scalping_momentum',
      opened_at: MINUTES_AGO(45),
      last_synced_at: MINUTES_AGO(0.2),
    },
    {
      id: 2,
      symbol: 'ETHUSDT',
      market_type: 'futures',
      side: 'SHORT',
      entry_price: 3215.8,
      quantity: 0.5,
      leverage: 3,
      unrealized_pnl_usdt: -5.97,
      sl_price: 3260.0,
      tp_price: 3140.0,
      liquidation_price: 4287.0,
      margin_usdt: 535.97,
      status: 'open',
      strategy_name: 'swing_smc',
      opened_at: MINUTES_AGO(120),
      last_synced_at: MINUTES_AGO(0.2),
    },
  ];
}

export function mockTrades(): MockTrade[] {
  const closeReasons: MockTrade['close_reason'][] = ['tp', 'sl', 'manual', 'tp', 'tp'];
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
      symbol: symbols[i],
      market_type: i % 2 === 0 ? 'futures' : 'spot',
      side: 'LONG',
      quantity: qty,
      entry_price: entry,
      exit_price: Number(exit.toFixed(2)),
      leverage: i % 2 === 0 ? 5 : 1,
      realized_pnl_usdt: Number(realized.toFixed(2)),
      commission_usdt: Number(commission.toFixed(2)),
      funding_paid_usdt: 0,
      net_pnl_usdt: Number((realized - commission).toFixed(2)),
      duration_seconds: 1800 + i * 600,
      opened_at: MINUTES_AGO(60 * (i + 2)),
      closed_at: MINUTES_AGO(60 * (i + 1)),
      close_reason: closeReasons[i],
      strategy_name: strategies[i % strategies.length],
    };
  });
}

export function mockEquitySeries(): MockEquityPoint[] {
  let eq = 1100;
  return Array.from({ length: 30 }, (_, i) => {
    eq += (Math.sin(i / 3) + 0.5) * 5;
    return {
      recorded_at: new Date(Date.now() - (30 - i) * 60 * 60 * 1000).toISOString(),
      total_equity_usdt: Number(eq.toFixed(2)),
      unrealized_pnl: Number((Math.cos(i / 4) * 12).toFixed(2)),
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
      entry_price: entry,
      sl_price: direction === 'bullish' ? entry * 0.99 : entry * 1.01,
      tp_price: direction === 'bullish' ? entry * 1.02 : entry * 0.98,
      confidence: 0.7 + (i % 3) * 0.08,
      risk_reward_ratio: 2 + (i % 3) * 0.5,
      generated_at: MINUTES_AGO(15 * (i + 1)),
      outcome: i < 2 ? 'pending' : i < 6 ? 'executed' : 'expired',
    };
  });
}

export function mockRiskProfile(): MockRiskProfile {
  return {
    max_leverage: 10,
    max_concurrent_positions: 3,
    max_daily_loss_usd: 100,
    liquidation_buffer_atr: 3,
    risk_per_trade_pct: 1,
    kill_switch_active: false,
    loss_streak_threshold: 3,
    loss_streak_cooldown_min: 30,
  };
}

export function mockStrategies(): MockStrategy[] {
  return [
    {
      name: 'scalping_momentum',
      display_name: 'Scalping Momentum',
      description: 'High-frequency M5/M15 entries riding momentum bursts; futures-focused.',
      min_tier: 'CRYPTO_BASIC',
      market_types: ['futures'],
      default_params: { timeframe: 'M5', min_volume_usd: 50_000_000, atr_filter: 1.5 },
    },
    {
      name: 'spot_dca_trend',
      display_name: 'Spot DCA Trend',
      description: 'Trend-following dollar-cost averaging on spot — accumulation pattern.',
      min_tier: 'CRYPTO_BASIC',
      market_types: ['spot'],
      default_params: { timeframe: 'H4', dca_steps: 4, dca_interval_pct: 2 },
    },
    {
      name: 'swing_smc',
      display_name: 'Swing SMC',
      description: 'Smart Money Concepts swing setups on H1/H4 — order block + FVG entries.',
      min_tier: 'CRYPTO_PRO',
      market_types: ['spot', 'futures'],
      default_params: { timeframe: 'H1', min_rr: 2, fvg_filter: true },
    },
    {
      name: 'wyckoff_breakout',
      display_name: 'Wyckoff Breakout',
      description: 'Accumulation/distribution phase detection + spring-then-breakout entries.',
      min_tier: 'CRYPTO_PRO',
      market_types: ['spot', 'futures'],
      default_params: { timeframe: 'H4', range_min_bars: 24, volume_confirm: true },
    },
    {
      name: 'mean_reversion',
      display_name: 'Mean Reversion',
      description: 'Range-bound futures setups — fade overshoots back to VWAP.',
      min_tier: 'CRYPTO_PRO',
      market_types: ['futures'],
      default_params: { timeframe: 'M15', vwap_dev_min: 2 },
    },
    {
      name: 'spot_swing_trend',
      display_name: 'Spot Swing Trend',
      description: 'H4 trend-following on spot with trailing stop discipline.',
      min_tier: 'CRYPTO_PRO',
      market_types: ['spot'],
      default_params: { timeframe: 'H4', trailing_atr_mult: 2 },
    },
  ];
}

export function mockKeyStatus(): {
  connected: boolean;
  last_verified_at: string | null;
  permissions: { canTrade: boolean; canWithdraw: boolean; canRead: boolean };
} {
  return {
    connected: false,
    last_verified_at: null,
    permissions: { canTrade: false, canWithdraw: false, canRead: false },
  };
}

void NOW;
