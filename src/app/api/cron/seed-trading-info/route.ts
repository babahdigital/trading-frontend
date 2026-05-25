export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/auth/cron';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';
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
} from '@/lib/trading/product-info';
import { invalidateTradingCache } from '@/lib/trading/trading-settings';

const log = createLogger('api/cron/seed-trading-info');

const SEEDS: { key: string; value: unknown }[] = [
  { key: 'trading:forex_strategies', value: FOREX_STRATEGIES },
  { key: 'trading:crypto_strategies', value: CRYPTO_STRATEGIES },
  { key: 'trading:forex_pairs', value: { live: [...FOREX_PAIRS_LIVE], shadow: [...FOREX_PAIRS_SHADOW] } },
  { key: 'trading:crypto_config', value: { market: CRYPTO_MARKET, exchange: CRYPTO_EXCHANGE, hasSpot: CRYPTO_HAS_SPOT, tiers: CRYPTO_TIERS } },
  { key: 'trading:forex_stats', value: FOREX_LIFETIME_STATS },
  { key: 'trading:execution_model', value: FOREX_EXECUTION_MODEL },
  { key: 'trading:product_names', value: PRODUCT_NAMES },
];

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ code: 'unauthorized', error: 'unauthorized' }, { status: 401 });
  }

  const results: string[] = [];
  for (const seed of SEEDS) {
    const json = JSON.stringify(seed.value);
    await prisma.siteSetting.upsert({
      where: { key: seed.key },
      update: { value: json, type: 'json' },
      create: { key: seed.key, value: json, type: 'json' },
    });
    results.push(seed.key);
  }

  invalidateTradingCache();
  log.info('Seeded ' + results.length + ' trading info keys');

  return NextResponse.json({ seeded: results });
}
