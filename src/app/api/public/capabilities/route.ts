export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/public/capabilities');

/**
 * Public capability catalog — no auth required (per CAPABILITIES_API_GUIDE §1.1).
 *
 * Returns the global feature catalog (indicators / strategies / ai_subsystems)
 * with required tier per item. Used by:
 * - Pricing page tier comparison ladder
 * - Marketing landing capability showcase
 * - Public docs
 *
 * Cache-Control: 15 minutes (catalog only changes on backend deploy per §6).
 */

interface CapabilityItem {
  name: string;
  category: 'indicator' | 'strategy' | 'ai_subsystem';
  available_in_tier: 'beta' | 'starter' | 'pro' | 'vip' | 'dedicated';
  description: string;
}

interface CapabilitiesResponse {
  tiers: ('beta' | 'starter' | 'pro' | 'vip' | 'dedicated')[];
  indicators: CapabilityItem[];
  strategies: CapabilityItem[];
  ai_subsystems: CapabilityItem[];
}

const FALLBACK: CapabilitiesResponse = {
  tiers: ['beta', 'starter', 'pro', 'vip', 'dedicated'],
  indicators: [
    { name: 'ema', category: 'indicator', available_in_tier: 'beta', description: 'Exponential Moving Average' },
    { name: 'rsi', category: 'indicator', available_in_tier: 'beta', description: 'Relative Strength Index' },
    { name: 'macd', category: 'indicator', available_in_tier: 'beta', description: 'Moving Average Convergence Divergence' },
    { name: 'atr', category: 'indicator', available_in_tier: 'beta', description: 'Average True Range' },
    { name: 'volume', category: 'indicator', available_in_tier: 'beta', description: 'Volume profile dasar' },
    { name: 'fibonacci', category: 'indicator', available_in_tier: 'starter', description: 'Fibonacci retracement levels' },
    { name: 'candlestick_patterns', category: 'indicator', available_in_tier: 'starter', description: 'Morning/Evening Star, Doji, Engulfing, Pin Bar' },
    { name: 'pivot_points', category: 'indicator', available_in_tier: 'starter', description: 'Daily/Weekly pivot points' },
    { name: 'trend_strength', category: 'indicator', available_in_tier: 'starter', description: 'ADX-based trend strength scoring' },
    { name: 'momentum_oscillator', category: 'indicator', available_in_tier: 'starter', description: 'Stochastic + RSI confluence' },
    { name: 'smc_bos', category: 'indicator', available_in_tier: 'pro', description: 'Break of Structure (Smart Money Concepts)' },
    { name: 'smc_choch', category: 'indicator', available_in_tier: 'pro', description: 'Change of Character (Smart Money)' },
    { name: 'smc_order_block', category: 'indicator', available_in_tier: 'pro', description: 'Order block detection' },
    { name: 'smc_fvg', category: 'indicator', available_in_tier: 'pro', description: 'Fair Value Gap (FVG)' },
    { name: 'wyckoff_phase', category: 'indicator', available_in_tier: 'pro', description: 'Wyckoff accumulation/distribution phase' },
    { name: 'wyckoff_spring', category: 'indicator', available_in_tier: 'pro', description: 'Wyckoff Spring detection' },
    { name: 'snd_zones', category: 'indicator', available_in_tier: 'pro', description: 'Supply & Demand zone mapping' },
    { name: 'divergence', category: 'indicator', available_in_tier: 'pro', description: 'Multi-timeframe divergence detector' },
    { name: 'liquidity_pools', category: 'indicator', available_in_tier: 'pro', description: 'Equal highs/lows liquidity tracking' },
    { name: 'session_volatility', category: 'indicator', available_in_tier: 'pro', description: 'Asia/London/NY session volatility profile' },
    { name: 'chart_patterns', category: 'indicator', available_in_tier: 'vip', description: 'Triangle, Wedge, H&S geometric pattern auto-detection' },
    { name: 'auto_trendline', category: 'indicator', available_in_tier: 'vip', description: 'Auto-trendline + breakout alert' },
    { name: 'news_sentiment_bias', category: 'indicator', available_in_tier: 'vip', description: 'News sentiment offensive bias scoring' },
    { name: 'economic_calendar', category: 'indicator', available_in_tier: 'vip', description: 'Economic calendar impact overlay' },
    { name: 'volatility_target', category: 'indicator', available_in_tier: 'vip', description: 'Vol-target position sizing' },
    { name: 'astronacci_lunar_phase', category: 'indicator', available_in_tier: 'dedicated', description: 'Lunar phase + illumination cycle' },
    { name: 'astronacci_planetary', category: 'indicator', available_in_tier: 'dedicated', description: 'Planetary alignment + Fibonacci-Astro confluence' },
    { name: 'astronacci_solar', category: 'indicator', available_in_tier: 'dedicated', description: 'Solar cycle + harmonic resonance' },
  ],
  strategies: [
    { name: 'scalper.sr_retest', category: 'strategy', available_in_tier: 'beta', description: 'Support/Resistance retest scalper' },
    { name: 'ai_momentum', category: 'strategy', available_in_tier: 'starter', description: 'AI-driven momentum continuation' },
    { name: 'trend_pullback', category: 'strategy', available_in_tier: 'starter', description: 'Trend pullback entry' },
    { name: 'qm_reversal', category: 'strategy', available_in_tier: 'pro', description: 'Quasimodo reversal pattern' },
    { name: 'snd_wyckoff', category: 'strategy', available_in_tier: 'pro', description: 'Supply/Demand + Wyckoff confluence' },
    { name: 'swing.structure_break', category: 'strategy', available_in_tier: 'pro', description: 'Multi-timeframe structure break' },
    { name: 'trend_continuation', category: 'strategy', available_in_tier: 'pro', description: 'Trend continuation with risk overlay' },
    { name: 'swing.geometric_breakout', category: 'strategy', available_in_tier: 'vip', description: 'Chart pattern geometric breakout' },
    { name: 'news_momentum', category: 'strategy', available_in_tier: 'vip', description: 'High-impact news momentum entry' },
    { name: 'astronacci.moon_reversal', category: 'strategy', available_in_tier: 'dedicated', description: 'Lunar-Fibonacci reversal' },
    { name: 'astronacci.planetary_pivot', category: 'strategy', available_in_tier: 'dedicated', description: 'Planetary pivot + harmonic entry' },
  ],
  ai_subsystems: [
    { name: 'sentiment_scoring_defensive', category: 'ai_subsystem', available_in_tier: 'beta', description: 'News sentiment for trade blackout' },
    { name: 'daily_summary', category: 'ai_subsystem', available_in_tier: 'starter', description: 'Daily performance + market summary' },
    { name: 'entry_advisor_shadow', category: 'ai_subsystem', available_in_tier: 'pro', description: 'Entry advisor (shadow mode — log only)' },
    { name: 'exit_layer_6', category: 'ai_subsystem', available_in_tier: 'pro', description: 'Layer-6 exit timing optimizer' },
    { name: 'weekly_retrospect', category: 'ai_subsystem', available_in_tier: 'vip', description: 'Weekly retrospect (Claude Sonnet)' },
    { name: 'entry_veto_mode', category: 'ai_subsystem', available_in_tier: 'vip', description: 'Entry veto mode (active blocking)' },
    { name: 'custom_strategy_params', category: 'ai_subsystem', available_in_tier: 'dedicated', description: 'Custom strategy parameter tuning + dedicated VPS' },
  ],
};

const CACHE_TTL_MS = 15 * 60 * 1000;
let cache: { ts: number; payload: CapabilitiesResponse } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json(
      { source: 'cache', ...cache.payload },
      { headers: { 'Cache-Control': 'public, max-age=900' } },
    );
  }

  try {
    const res = await proxyToMasterBackend('signals', '/v1/capabilities', { method: 'GET' });
    if (res.ok) {
      const body = (await res.json()) as CapabilitiesResponse;
      if (body.tiers && body.indicators && body.strategies && body.ai_subsystems) {
        cache = { ts: Date.now(), payload: body };
        return NextResponse.json(
          { source: 'backend', ...body },
          { headers: { 'Cache-Control': 'public, max-age=900' } },
        );
      }
    }
    log.warn(`Capabilities backend HTTP ${res.status}`);
  } catch (err) {
    log.warn(`Capabilities backend error: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  // Fallback — schema-accurate static catalog
  cache = { ts: Date.now(), payload: FALLBACK };
  return NextResponse.json(
    { source: 'fallback', ...FALLBACK },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  );
}
