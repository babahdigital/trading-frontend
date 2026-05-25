export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getTradingSettings } from '@/lib/trading/trading-settings';

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') ?? 'id';
  const settings = await getTradingSettings();

  const forexStrategies = settings.forexStrategies.map(s => ({
    slug: s.slug,
    name: s.name,
    timeframe: s.timeframe,
    status: s.status,
    description: locale === 'en' ? s.desc_en : s.desc_id,
    variants: s.variants,
  }));

  const cryptoStrategies = settings.cryptoStrategies.map(s => ({
    slug: s.slug,
    name: s.name,
    tier: s.tier,
    timeframe: s.timeframe,
  }));

  const disclaimer = locale === 'en'
    ? settings.executionModel.disclaimer_en
    : settings.executionModel.disclaimer_id;

  return NextResponse.json({
    products: settings.productNames,
    forex: {
      strategies: forexStrategies,
      strategyCount: forexStrategies.length,
      pairs: settings.forexPairs,
      stats: settings.forexStats,
    },
    crypto: {
      strategies: cryptoStrategies,
      strategyCount: cryptoStrategies.length,
      config: {
        market: settings.cryptoConfig.market,
        exchange: settings.cryptoConfig.exchange,
        hasSpot: settings.cryptoConfig.hasSpot,
      },
      tiers: settings.cryptoConfig.tiers,
    },
    execution: {
      type: settings.executionModel.type,
      hasAI: settings.executionModel.hasAI,
      engine: settings.executionModel.engine,
      components: settings.executionModel.components,
      disclaimer,
    },
  }, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
