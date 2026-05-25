/**
 * Trading settings — CMS-driven product info via SiteSetting JSON store.
 *
 * Pattern mirrors src/lib/company/settings.ts: typed facade over SiteSetting
 * with 60s in-memory cache + hardcoded fallback from product-info.ts.
 *
 * Admin edits at /admin/cms/site-settings → reflect on public pages in ≤60s.
 * No code redeploy needed for strategy/pair/tier changes.
 *
 * Keys: trading:forex_strategies, trading:crypto_strategies, trading:forex_pairs,
 *        trading:crypto_config, trading:forex_stats, trading:execution_model,
 *        trading:product_names
 */

import { prisma } from '@/lib/db/prisma';
import {
  FOREX_STRATEGIES,
  FOREX_PAIRS_LIVE,
  FOREX_PAIRS_SHADOW,
  FOREX_LIFETIME_STATS,
  FOREX_EXECUTION_MODEL,
  CRYPTO_STRATEGIES,
  CRYPTO_TIERS,
  CRYPTO_MARKET,
  CRYPTO_EXCHANGE,
  CRYPTO_HAS_SPOT,
  PRODUCT_NAMES,
} from './product-info';

// ─── Types ───

export interface ForexStrategy {
  slug: string;
  name: string;
  variants: string[];
  timeframe: string;
  status: 'live' | 'new' | 'halted' | 'retired';
  desc_id: string;
  desc_en: string;
}

export interface CryptoStrategy {
  slug: string;
  name: string;
  tier: string;
  timeframe: string;
}

export interface ForexPairs {
  live: string[];
  shadow: string[];
}

export interface ForexStats {
  trades: number;
  pnl: number;
  winRate: number;
}

export interface ExecutionModel {
  type: string;
  hasAI: boolean;
  engine: string;
  components: string[];
  disclaimer_id: string;
  disclaimer_en: string;
}

export interface CryptoTier {
  slug: string;
  name: string;
  price_usd: number;
  price_idr: number;
  slots: number;
  leverage: number;
  risk_pct: number;
  strategies: string[];
  popular?: boolean;
}

export interface CryptoConfig {
  market: string;
  exchange: string;
  hasSpot: boolean;
  tiers: CryptoTier[];
}

export interface ProductNames {
  forex: string;
  crypto: string;
}

export interface TradingSettings {
  forexStrategies: ForexStrategy[];
  cryptoStrategies: CryptoStrategy[];
  forexPairs: ForexPairs;
  cryptoConfig: CryptoConfig;
  forexStats: ForexStats;
  executionModel: ExecutionModel;
  productNames: ProductNames;
}

// ─── Cache ───

const CACHE_TTL_MS = 60_000;
let cache: { value: TradingSettings; expiry: number } | null = null;

// ─── Defaults (fallback when DB empty) ───

function defaults(): TradingSettings {
  return {
    forexStrategies: FOREX_STRATEGIES.map(s => ({ ...s, variants: [...s.variants] })),
    cryptoStrategies: CRYPTO_STRATEGIES.map(s => ({ ...s })),
    forexPairs: { live: [...FOREX_PAIRS_LIVE], shadow: [...FOREX_PAIRS_SHADOW] },
    cryptoConfig: {
      market: CRYPTO_MARKET,
      exchange: CRYPTO_EXCHANGE,
      hasSpot: CRYPTO_HAS_SPOT,
      tiers: CRYPTO_TIERS.map(t => ({ ...t, strategies: [...t.strategies] })),
    },
    forexStats: { ...FOREX_LIFETIME_STATS },
    executionModel: { ...FOREX_EXECUTION_MODEL, components: [...FOREX_EXECUTION_MODEL.components] },
    productNames: { ...PRODUCT_NAMES },
  };
}

const SETTING_KEYS = [
  'trading:forex_strategies',
  'trading:crypto_strategies',
  'trading:forex_pairs',
  'trading:crypto_config',
  'trading:forex_stats',
  'trading:execution_model',
  'trading:product_names',
] as const;

type SettingKey = (typeof SETTING_KEYS)[number];

function parseJson<T>(value: string | undefined | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// ─── Main fetch ───

export async function getTradingSettings(opts: { skipCache?: boolean } = {}): Promise<TradingSettings> {
  if (!opts.skipCache && cache && Date.now() < cache.expiry) return cache.value;

  const d = defaults();

  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: [...SETTING_KEYS] } },
    });

    const map = new Map(rows.map(r => [r.key, r.value]));

    const settings: TradingSettings = {
      forexStrategies: parseJson(map.get('trading:forex_strategies'), d.forexStrategies),
      cryptoStrategies: parseJson(map.get('trading:crypto_strategies'), d.cryptoStrategies),
      forexPairs: parseJson(map.get('trading:forex_pairs'), d.forexPairs),
      cryptoConfig: parseJson(map.get('trading:crypto_config'), d.cryptoConfig),
      forexStats: parseJson(map.get('trading:forex_stats'), d.forexStats),
      executionModel: parseJson(map.get('trading:execution_model'), d.executionModel),
      productNames: parseJson(map.get('trading:product_names'), d.productNames),
    };

    cache = { value: settings, expiry: Date.now() + CACHE_TTL_MS };
    return settings;
  } catch {
    cache = { value: d, expiry: Date.now() + CACHE_TTL_MS };
    return d;
  }
}

// ─── Convenience accessors ───

export async function getForexStrategies(): Promise<ForexStrategy[]> {
  return (await getTradingSettings()).forexStrategies;
}

export async function getCryptoStrategies(): Promise<CryptoStrategy[]> {
  return (await getTradingSettings()).cryptoStrategies;
}

export async function getForexPairs(): Promise<ForexPairs> {
  return (await getTradingSettings()).forexPairs;
}

export async function getCryptoConfig(): Promise<CryptoConfig> {
  return (await getTradingSettings()).cryptoConfig;
}

export async function getForexStats(): Promise<ForexStats> {
  return (await getTradingSettings()).forexStats;
}

export async function getExecutionModel(): Promise<ExecutionModel> {
  return (await getTradingSettings()).executionModel;
}

export async function getProductNames(): Promise<ProductNames> {
  return (await getTradingSettings()).productNames;
}

export function invalidateTradingCache(): void {
  cache = null;
}
