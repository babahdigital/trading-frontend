import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import { breadcrumbSchema, ldJson, organizationSchema } from '@/lib/seo-jsonld';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

const STRATEGY_SLUGS = ['smc', 'wyckoff', 'astronacci', 'ai-momentum', 'oil-gas', 'smc-swing'] as const;

type StrategySlug = (typeof STRATEGY_SLUGS)[number];

interface StrategyData {
  name: string;
  subtitle: string;
  abstract: [string, string];
  mechanism: string[];
  confluence: { timeframe: string; role: string }[];
  riskProfile: {
    winRate: string;
    avgRR: string;
    avgHold: string;
    maxConsecutiveLoss: string;
  };
}

const STRATEGY_DATA: Record<StrategySlug, StrategyData> = {
  smc: {
    name: 'SMC Intraday',
    subtitle: 'Institutional order flow applied to intraday timeframes',
    abstract: [
      'Smart Money Concepts (SMC) is a structural approach to price action analysis that seeks to identify the footprints left by institutional participants -- banks, hedge funds, and proprietary trading desks -- as they accumulate and distribute positions. Unlike retail-oriented indicator strategies, SMC focuses on the mechanics of liquidity: where it rests, how it is engineered, and when it is harvested. The BabahAlgo SMC Intraday strategy automates this process through algorithmic detection of order blocks, fair value gaps, breaker blocks, and liquidity sweeps across multiple timeframes.',
      'The strategy operates primarily on the M5 to H1 range, using H4 for directional bias and H1 for structural context. Entry signals are generated when M15 structure aligns with the higher-timeframe narrative, with M5 providing precision timing. Every signal must pass through the full 12-layer risk framework before execution. The system is designed for high-frequency intraday operation, targeting 3-8 trades per day across the seven major forex pairs, with a strict maximum hold duration of 4 hours.',
    ],
    mechanism: [
      'H4 bias determination: Identify premium/discount zones relative to the current dealing range. Determine whether price is in an institutional accumulation or distribution phase based on swing structure and volume profile.',
      'H1 structural mapping: Mark active order blocks (last bearish candle before a bullish impulse, or vice versa), fair value gaps (three-candle imbalances), and breaker blocks (failed order blocks that become support/resistance). Identify key liquidity pools above swing highs and below swing lows.',
      'M15 confluence check: Wait for a change of character (CHoCH) or break of structure (BOS) that aligns with the H4 bias. Confirm that the move originates from a valid H1 point of interest (order block, FVG, or breaker).',
      'M5 entry trigger: Refine entry using M5 order flow. Look for a mitigation of an M5 order block within the M15 zone, combined with a displacement candle (strong momentum candle with body > 70% of range). Enter at the close of the displacement candle or on a retest of the M5 order block.',
      'Stop placement: Place the protective stop below the M15 swing low (for longs) or above the M15 swing high (for shorts), ensuring it sits beyond the institutional reference point. Typical stop distance is 15-25 pips on major pairs.',
      'Target calculation: Primary target at the nearest H1 liquidity pool or opposing order block. Secondary target at the H4 premium/discount boundary. Use a trailing mechanism that ratchets to breakeven after 1R profit.',
    ],
    confluence: [
      { timeframe: 'H4', role: 'Directional bias and dealing range identification' },
      { timeframe: 'H1', role: 'Structural mapping: order blocks, FVGs, liquidity pools' },
      { timeframe: 'M15', role: 'CHoCH/BOS confirmation and zone validation' },
      { timeframe: 'M5', role: 'Precision entry timing and displacement confirmation' },
    ],
    riskProfile: {
      winRate: '62%',
      avgRR: '1:1.8',
      avgHold: '1h 45m',
      maxConsecutiveLoss: '5',
    },
  },
  wyckoff: {
    name: 'Wyckoff Accumulation-Distribution',
    subtitle: 'Classical volume-price methodology automated for modern markets',
    abstract: [
      'The Wyckoff method, developed by Richard D. Wyckoff in the early 20th century, remains one of the most rigorous frameworks for understanding market structure. It posits that markets move through repeating phases of accumulation (institutional buying), markup (trending), distribution (institutional selling), and markdown (declining). The BabahAlgo Wyckoff strategy automates the identification of these phases through algorithmic volume-price analysis, spring/upthrust detection, and phase transition confirmation.',
      'This strategy operates on the M15 to H4 range, giving it a slightly longer holding period than the SMC Intraday approach. It is particularly effective in ranging markets where accumulation and distribution phases are clearly delineated. The system monitors volume divergences, effort-versus-result relationships, and the sequential appearance of Wyckoff events (preliminary support, selling climax, automatic rally, secondary test, spring) to build a probabilistic model of phase progression. Trades are only initiated when the phase model reaches high confidence and the entry aligns with a valid Wyckoff event.',
    ],
    mechanism: [
      'Phase identification: Continuously classify the current market phase (accumulation, markup, distribution, markdown) using a composite of price range analysis, volume profile, and swing point sequencing. Update phase confidence scores on every H1 close.',
      'Event detection: Monitor for Wyckoff events within the identified phase. In accumulation: preliminary support (PS), selling climax (SC), automatic rally (AR), secondary test (ST), and spring. In distribution: preliminary supply (PSY), buying climax (BC), automatic reaction (AR), secondary test (ST), and upthrust (UT).',
      'Volume-price divergence: Analyze effort versus result on each swing. A declining volume on a test of support in accumulation, or declining volume on a test of resistance in distribution, confirms institutional intent.',
      'Spring/upthrust entry: The primary entry signal is the spring (a brief penetration below the trading range low that is immediately reversed) in accumulation, or the upthrust (a brief penetration above the range high) in distribution. Enter on the reversal candle close with stop beyond the spring/upthrust wick.',
      'Sign of strength confirmation: After entry, monitor for a sign of strength (SOS) -- a strong impulsive move away from the trading range on increasing volume -- to confirm phase transition. If SOS does not appear within the expected window, tighten stops to breakeven.',
      'Target projection: Project targets using the point-and-figure count method applied to the trading range width. Primary target equals the range width added to the breakout point. Secondary target at 1.618x the range width.',
    ],
    confluence: [
      { timeframe: 'H4', role: 'Phase identification and range boundary definition' },
      { timeframe: 'H1', role: 'Event detection and volume-price divergence analysis' },
      { timeframe: 'M15', role: 'Spring/upthrust entry timing and SOS confirmation' },
      { timeframe: 'M5', role: 'Entry refinement and stop placement optimization' },
    ],
    riskProfile: {
      winRate: '58%',
      avgRR: '1:2.2',
      avgHold: '3h 10m',
      maxConsecutiveLoss: '4',
    },
  },
  astronacci: {
    name: 'Astronacci Harmonic',
    subtitle: 'Fibonacci confluence zones with astro-cyclical timing alignment',
    abstract: [
      'The Astronacci strategy represents a proprietary synthesis of harmonic price geometry and cyclical timing analysis. At its core, the system identifies zones where multiple Fibonacci retracement and extension levels converge -- creating "clusters" of mathematical significance that historically correspond to high-probability reversal or continuation points. These geometric confluences are then cross-referenced with planetary cycle timing windows to filter entries to periods of heightened market sensitivity.',
      'Operating primarily on the H1 to H4 range, this strategy is designed for swing-style entries with moderate holding periods. The system continuously maps Fibonacci levels from multiple swing points across timeframes, scoring each zone by the density of overlapping levels. When a high-density zone coincides with a cyclical timing window, the system flags a potential setup. Entry is confirmed only when price action within the zone demonstrates a reversal pattern consistent with the expected direction. This multi-layer approach reduces false signals significantly compared to single-timeframe Fibonacci strategies.',
    ],
    mechanism: [
      'Multi-swing Fibonacci mapping: Calculate Fibonacci retracement (23.6%, 38.2%, 50%, 61.8%, 78.6%) and extension (127.2%, 161.8%, 200%) levels from every significant swing point on H4 and H1 timeframes. A significant swing is defined as a pivot that exceeds the average true range of the surrounding 20 candles.',
      'Confluence zone scoring: Identify price levels where three or more Fibonacci levels from different swing points converge within a tolerance of 0.1% of price. Score each zone by the number of overlapping levels and the quality of the source swings. Zones scoring 5+ are classified as high-priority.',
      'Cyclical timing alignment: Cross-reference high-priority zones with planetary cycle timing windows derived from lunar, solar, and planetary aspect calculations. Setups that fall within active timing windows receive elevated priority.',
      'Price action confirmation: Within a valid zone during an active window, monitor for reversal candlestick patterns on M15: engulfing patterns, pin bars (wicks > 2x body), or inside bar breakouts. The confirmation candle must close within or beyond the confluence zone.',
      'Entry and stop: Enter at the close of the confirmation candle. Place stop beyond the far edge of the confluence zone plus a buffer of 0.5x ATR(14). This ensures the stop respects the geometric boundary that defines the setup.',
      'Harmonic target projection: Primary target at the next high-priority confluence zone in the direction of the trade. Secondary target at the 161.8% Fibonacci extension of the entry swing. Trail stops using a 2x ATR ratchet after 1R profit.',
    ],
    confluence: [
      { timeframe: 'H4', role: 'Primary swing identification and Fibonacci source mapping' },
      { timeframe: 'H1', role: 'Secondary swing mapping and confluence zone scoring' },
      { timeframe: 'M15', role: 'Price action confirmation and entry timing' },
      { timeframe: 'M5', role: 'Precision entry and stop optimization' },
    ],
    riskProfile: {
      winRate: '55%',
      avgRR: '1:2.5',
      avgHold: '2h 50m',
      maxConsecutiveLoss: '6',
    },
  },
  'ai-momentum': {
    name: 'AI Momentum',
    subtitle: 'Machine learning-driven momentum classification with AI confidence scoring',
    abstract: [
      'The AI Momentum strategy represents the convergence of traditional momentum analysis with modern large language model capabilities. At its foundation, the system uses Gemini 2.5 Flash to perform real-time analysis of market structure, news sentiment, and cross-pair correlation for each monitored instrument. The AI generates a structured assessment including directional bias, confidence score (0-100), key support/resistance levels, and a risk commentary. This AI layer acts as the first filter -- only setups where the AI confidence exceeds the strategy threshold proceed to the technical momentum engine.',
      'The technical momentum engine operates on M15 to H1, combining rate-of-change analysis, volume-weighted momentum scoring, and ADX trend strength filtering to classify the current momentum regime (strong trend, weak trend, ranging, or transitioning). Trades are initiated only when the AI directional bias aligns with a strong or accelerating momentum regime, creating a dual-confirmation system that reduces false signals in choppy or transitioning markets. The result is a strategy that captures genuine momentum moves while avoiding the whipsaws that plague traditional momentum approaches.',
    ],
    mechanism: [
      'AI analysis cycle: Every 15 minutes, submit current market state (OHLCV data, recent price action, open positions, recent trade history) to Gemini 2.5 Flash with a structured prompt. Receive a JSON response containing: directional bias (LONG/SHORT/NEUTRAL), confidence score (0-100), key levels, timeframe assessment, and risk notes.',
      'Confidence filtering: Only proceed with setups where AI confidence >= 70. Setups with confidence 70-80 require full technical confluence. Setups with confidence > 80 may proceed with reduced confluence requirements. Neutral bias signals pause new entries for the pair.',
      'Momentum regime classification: Calculate 14-period and 28-period rate of change on H1. Compute volume-weighted momentum score using tick volume as a proxy. Read ADX(14) to assess trend strength. Classify regime: Strong Trend (ADX > 25, ROC aligned), Weak Trend (ADX 20-25), Ranging (ADX < 20), Transitioning (ADX crossing 20-25 zone).',
      'Entry signal: Generate an entry signal when AI bias is LONG or SHORT, confidence >= threshold, and the momentum regime is classified as Strong Trend or Transitioning-to-Strong. Enter on the close of an M15 candle that confirms the direction with a body-to-range ratio > 60%.',
      'Dynamic position sizing: Adjust lot size based on AI confidence level and current account equity. Higher confidence scores allow marginally larger position sizes within the risk framework limits. All sizing remains subject to the 12-layer risk filter.',
      'Adaptive exit: Primary exit at the AI-identified key level in the profit direction. Trailing stop activates after 1R using an ATR-based ratchet. If AI confidence drops below 50 on a subsequent cycle while the position is open, tighten stops to breakeven regardless of current P&L.',
    ],
    confluence: [
      { timeframe: 'H4', role: 'Macro trend context for AI analysis input' },
      { timeframe: 'H1', role: 'Momentum regime classification and ADX/ROC analysis' },
      { timeframe: 'M15', role: 'Entry signal generation and confirmation' },
      { timeframe: 'M5', role: 'Entry timing refinement' },
    ],
    riskProfile: {
      winRate: '64%',
      avgRR: '1:1.6',
      avgHold: '1h 20m',
      maxConsecutiveLoss: '4',
    },
  },
  'oil-gas': {
    name: 'Oil & Gas Macro',
    subtitle: 'Energy-sector specialist strategy for crude oil and natural gas',
    abstract: [
      'The Oil & Gas Macro strategy is a specialist approach designed exclusively for energy markets: USOIL (WTI Crude), UKOIL (Brent Crude), and XNGUSD (Natural Gas). Energy markets behave differently from forex pairs -- they are driven by supply-demand fundamentals (inventory data, OPEC decisions, seasonal demand cycles), geopolitical risk events, and weather patterns. A pure technical approach misses these dominant drivers. This strategy integrates fundamental data cycles with technical confluence to time entries around high-impact events.',
      'The system maintains a rolling fundamental model that tracks EIA inventory data release cycles, OPEC meeting schedules, seasonal demand patterns (winter heating, summer driving), and geopolitical risk scoring for key producing regions. When the fundamental model identifies a directional bias (e.g., inventory drawdown plus seasonal demand increase), the technical engine activates to find optimal entry points using supply/demand zone analysis on H1-H4 timeframes. This dual approach captures moves driven by fundamental catalysts while maintaining disciplined technical entries and risk management.',
    ],
    mechanism: [
      'Fundamental calendar tracking: Maintain a real-time calendar of EIA weekly inventory reports (Wednesday 10:30 ET), API inventory estimates (Tuesday 16:30 ET), OPEC meeting dates, and seasonal transition windows. Pre-position bias expectations before each data release based on market consensus and historical seasonal patterns.',
      'Geopolitical risk scoring: Monitor a composite risk score for energy-producing regions (Middle East, Russia, US shale). Elevated risk scores increase directional bias for long positions. The score is derived from news sentiment analysis processed through the AI advisor.',
      'Supply-demand zone mapping on H4: Identify institutional supply and demand zones on H4 using volume-profile analysis. Mark zones where price spent minimal time (indicating rapid institutional order absorption). These zones serve as the primary areas of interest for entries.',
      'H1 structural confirmation: Within an H4 supply/demand zone, wait for H1 to form a reversal structure -- a break of structure or change of character that aligns with the fundamental bias. This confirms that the technical picture supports the fundamental expectation.',
      'Entry on M15 with fundamental alignment: Enter on an M15 confirmation candle within the H1 reversal structure, but only during the 2-hour window surrounding a scheduled data release (for event-driven trades) or when the seasonal model is active (for trend-following trades).',
      'Volatility-adjusted stops: Energy markets exhibit higher volatility than forex. Stops are calculated using 2.5x ATR(14) on the entry timeframe, with a minimum of 50 pips for crude oil and 30 pips for natural gas. Targets use a 1:2 minimum risk-reward ratio.',
    ],
    confluence: [
      { timeframe: 'H4', role: 'Supply-demand zone identification and fundamental alignment' },
      { timeframe: 'H1', role: 'Structural reversal confirmation' },
      { timeframe: 'M15', role: 'Entry timing around data releases' },
      { timeframe: 'M5', role: 'Precision entry and volatility-adjusted stop placement' },
    ],
    riskProfile: {
      winRate: '57%',
      avgRR: '1:2.1',
      avgHold: '2h 30m',
      maxConsecutiveLoss: '5',
    },
  },
  'smc-swing': {
    name: 'SMC Swing',
    subtitle: 'Multi-day Smart Money positioning on higher timeframes',
    abstract: [
      'The SMC Swing strategy extends the Smart Money Concepts framework to higher timeframes, targeting multi-day moves that originate from weekly and daily institutional order flow. While the SMC Intraday strategy captures quick liquidity grabs on lower timeframes, SMC Swing operates in the H4 to D1 range, seeking positions that align with the broader institutional dealing range. The result is a lower-frequency, higher-conviction strategy with larger targets and proportionally wider stops.',
      'This strategy is designed for traders and institutional API clients that prioritize capital efficiency over trade frequency. By operating on higher timeframes, SMC Swing naturally filters out the noise and false signals that affect intraday approaches. The system identifies weekly premium and discount zones, maps daily order blocks and liquidity pools, and enters on H4 structural confirmations. Typical holding periods range from 8 to 48 hours, with the maximum capped at the system-wide 4-hour limit for risk management. Positions that require longer holds are structured as re-entries at the next valid setup rather than extended single holds.',
    ],
    mechanism: [
      'Weekly dealing range: On every weekly close, calculate the weekly premium (upper 50%) and discount (lower 50%) zones. Determine whether the prior week closed in premium or discount relative to the 20-week range. This establishes the macro directional bias -- seek longs in discount, shorts in premium.',
      'Daily order block identification: Map daily order blocks as the last opposing candle before an impulsive daily move. Qualify blocks by checking that the subsequent impulse was at least 2x the daily ATR. Mark the open and close of the order block candle as the zone of interest.',
      'Daily liquidity pool mapping: Identify clusters of equal highs and equal lows on the daily chart. These represent resting liquidity (stop orders) that institutional participants are likely to target. The system tracks these pools as potential targets and potential entry triggers (after a sweep).',
      'H4 structural entry: Wait for price to enter a daily order block or to sweep a daily liquidity pool. Then monitor H4 for a change of character (CHoCH) that indicates the institutional move has begun. Enter on the first H4 candle that closes beyond the CHoCH level.',
      'Stop and target: Place stop beyond the daily order block boundary (the far edge of the qualifying candle). This is typically 40-80 pips on major pairs. Primary target at the nearest daily liquidity pool in the profit direction. Secondary target at the opposing weekly zone boundary.',
      'Re-entry protocol: If the trade reaches its maximum hold duration before target, close the position. If the daily structure remains valid, re-enter on the next H4 CHoCH within the same daily zone. This allows the strategy to capture multi-day moves through a series of intraday positions rather than a single extended hold.',
    ],
    confluence: [
      { timeframe: 'W1/D1', role: 'Dealing range, order block, and liquidity pool mapping' },
      { timeframe: 'H4', role: 'Structural entry via CHoCH confirmation' },
      { timeframe: 'H1', role: 'Entry refinement and structural validation' },
      { timeframe: 'M15', role: 'Precision entry timing' },
    ],
    riskProfile: {
      winRate: '53%',
      avgRR: '1:2.8',
      avgHold: '3h 40m',
      maxConsecutiveLoss: '6',
    },
  },
};

function getAdjacentStrategies(slug: StrategySlug) {
  const idx = STRATEGY_SLUGS.indexOf(slug);
  const prev = idx > 0 ? STRATEGY_SLUGS[idx - 1] : null;
  const next = idx < STRATEGY_SLUGS.length - 1 ? STRATEGY_SLUGS[idx + 1] : null;
  return {
    prev: prev ? { slug: prev, name: STRATEGY_DATA[prev].name } : null,
    next: next ? { slug: next, name: STRATEGY_DATA[next].name } : null,
  };
}

export async function generateStaticParams() {
  return STRATEGY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!STRATEGY_SLUGS.includes(slug as StrategySlug)) {
    return { title: 'Strategy Not Found | BabahAlgo' };
  }
  const strategy = STRATEGY_DATA[slug as StrategySlug];
  const description = strategy.abstract[0].slice(0, 160);
  return {
    title: `${strategy.name} — Quantitative Strategy | BabahAlgo`,
    description,
    openGraph: {
      title: `${strategy.name} — BabahAlgo`,
      description,
      type: 'article',
    },
  };
}

export default async function StrategyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!STRATEGY_SLUGS.includes(slug as StrategySlug)) {
    notFound();
  }

  const strategy = STRATEGY_DATA[slug as StrategySlug];
  const { prev, next } = getAdjacentStrategies(slug as StrategySlug);

  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Platform', url: '/platform' },
    { name: 'Strategies', url: '/platform/strategies' },
    { name: strategy.name, url: `/platform/strategies/${slug}` },
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      <EnterpriseNav />
      <main className="max-w-4xl mx-auto px-6 py-20">
        {/* Back link */}
        <Link
          href="/platform/strategies"
          className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All strategies
        </Link>

        {/* Header */}
        <h1 className="font-display text-display-lg md:text-display-xl text-foreground mb-3">
          {strategy.name}
        </h1>
        <p className="text-muted-foreground leading-relaxed mb-12 text-lg">
          {strategy.subtitle}
        </p>

        {/* Abstract */}
        <section className="mb-16">
          <h2 className="font-display text-display-sm text-foreground mb-4">
            Abstract
          </h2>
          {strategy.abstract.map((paragraph, i) => (
            <p key={i} className="text-muted-foreground leading-relaxed mb-6">
              {paragraph}
            </p>
          ))}
        </section>

        {/* Mechanism */}
        <section className="mb-16">
          <h2 className="font-display text-display-sm text-foreground mb-4">
            Mechanism
          </h2>
          <div className="space-y-4">
            {strategy.mechanism.map((step, i) => (
              <div key={i} className="border border-border rounded-lg p-8 bg-card">
                <div className="flex gap-4">
                  <span className="font-mono text-accent text-sm font-semibold shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {step}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Multi-timeframe confluence */}
        <section className="mb-16">
          <h2 className="font-display text-display-sm text-foreground mb-4">
            Multi-timeframe confluence
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Every entry requires alignment across multiple timeframes. No single timeframe
            can generate a trade independently.
          </p>
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-sm font-semibold text-foreground px-6 py-3">
                    Timeframe
                  </th>
                  <th className="text-left text-sm font-semibold text-foreground px-6 py-3">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody>
                {strategy.confluence.map((row) => (
                  <tr key={row.timeframe} className="border-b border-border last:border-0">
                    <td className="font-mono text-sm text-accent px-6 py-3">
                      {row.timeframe}
                    </td>
                    <td className="text-sm text-muted-foreground px-6 py-3">
                      {row.role}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Risk profile */}
        <section className="mb-16">
          <h2 className="font-display text-display-sm text-foreground mb-4">
            Risk profile
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Win Rate', value: strategy.riskProfile.winRate },
              { label: 'Avg R:R', value: strategy.riskProfile.avgRR },
              { label: 'Avg Hold', value: strategy.riskProfile.avgHold },
              { label: 'Max Consec. Loss', value: strategy.riskProfile.maxConsecutiveLoss },
            ].map((metric) => (
              <div key={metric.label} className="border border-border rounded-lg p-8 bg-card text-center">
                <p className="font-mono text-xl text-accent mb-1">{metric.value}</p>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Navigation */}
        <section className="flex items-center justify-between pt-8 border-t border-border">
          <div>
            {prev && (
              <Link
                href={`/platform/strategies/${prev.slug}`}
                className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> {prev.name}
              </Link>
            )}
          </div>
          <div>
            {next && (
              <Link
                href={`/platform/strategies/${next.slug}`}
                className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
              >
                {next.name} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
