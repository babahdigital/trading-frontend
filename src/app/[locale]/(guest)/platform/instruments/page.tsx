'use client';

import { useState } from 'react';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';

interface Instrument {
  ticker: string;
  name: string;
  assetClass: string;
  avgSpread: string;
  tradingHours: string;
  status: string;
}

const INSTRUMENTS: Record<string, Instrument[]> = {
  Forex: [
    { ticker: 'EURUSD', name: 'Euro / US Dollar', assetClass: 'Forex', avgSpread: '0.8 pip', tradingHours: 'Sun 17:00 -- Fri 17:00 ET', status: 'Active' },
    { ticker: 'GBPUSD', name: 'British Pound / US Dollar', assetClass: 'Forex', avgSpread: '1.0 pip', tradingHours: 'Sun 17:00 -- Fri 17:00 ET', status: 'Active' },
    { ticker: 'USDJPY', name: 'US Dollar / Japanese Yen', assetClass: 'Forex', avgSpread: '0.9 pip', tradingHours: 'Sun 17:00 -- Fri 17:00 ET', status: 'Active' },
    { ticker: 'AUDUSD', name: 'Australian Dollar / US Dollar', assetClass: 'Forex', avgSpread: '1.1 pip', tradingHours: 'Sun 17:00 -- Fri 17:00 ET', status: 'Active' },
    { ticker: 'USDCHF', name: 'US Dollar / Swiss Franc', assetClass: 'Forex', avgSpread: '1.2 pip', tradingHours: 'Sun 17:00 -- Fri 17:00 ET', status: 'Active' },
    { ticker: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', assetClass: 'Forex', avgSpread: '1.3 pip', tradingHours: 'Sun 17:00 -- Fri 17:00 ET', status: 'Active' },
    { ticker: 'USDCAD', name: 'US Dollar / Canadian Dollar', assetClass: 'Forex', avgSpread: '1.4 pip', tradingHours: 'Sun 17:00 -- Fri 17:00 ET', status: 'Active' },
  ],
  Metals: [
    { ticker: 'XAUUSD', name: 'Gold / US Dollar', assetClass: 'Metals', avgSpread: '2.5 pip', tradingHours: 'Sun 18:00 -- Fri 17:00 ET', status: 'Active' },
    { ticker: 'XAGUSD', name: 'Silver / US Dollar', assetClass: 'Metals', avgSpread: '3.0 pip', tradingHours: 'Sun 18:00 -- Fri 17:00 ET', status: 'Active' },
  ],
  Energy: [
    { ticker: 'USOIL', name: 'WTI Crude Oil', assetClass: 'Energy', avgSpread: '3.5 pip', tradingHours: 'Sun 18:00 -- Fri 17:00 ET', status: 'Active' },
    { ticker: 'UKOIL', name: 'Brent Crude Oil', assetClass: 'Energy', avgSpread: '4.0 pip', tradingHours: 'Mon 01:00 -- Fri 17:00 ET', status: 'Active' },
    { ticker: 'XNGUSD', name: 'Natural Gas', assetClass: 'Energy', avgSpread: '5.0 pip', tradingHours: 'Sun 18:00 -- Fri 17:00 ET', status: 'Active' },
  ],
  Crypto: [
    { ticker: 'BTCUSD', name: 'Bitcoin / US Dollar', assetClass: 'Crypto', avgSpread: '15.0 pip', tradingHours: '24/7', status: 'Active' },
    { ticker: 'ETHUSD', name: 'Ethereum / US Dollar', assetClass: 'Crypto', avgSpread: '8.0 pip', tradingHours: '24/7', status: 'Active' },
  ],
};

const ASSET_CLASS_DESCRIPTIONS: Record<string, string> = {
  Forex:
    'Seven major and minor currency pairs selected for deep liquidity, tight spreads, and strong trending characteristics. These pairs form the core of the SMC, Wyckoff, Astronacci, and AI Momentum strategies.',
  Metals:
    'Gold and silver provide portfolio diversification and safe-haven exposure. These instruments respond to macro risk sentiment, inflation expectations, and central bank policy, offering uncorrelated return streams.',
  Energy:
    'WTI Crude, Brent Crude, and Natural Gas are traded through the specialized Oil & Gas Macro strategy, which integrates inventory data, OPEC dynamics, and seasonal demand patterns.',
  Crypto:
    'Bitcoin and Ethereum are monitored for high-conviction momentum setups. Due to their higher volatility, position sizes are reduced and spread guard thresholds are elevated.',
};

const ASSET_CLASSES = Object.keys(INSTRUMENTS);

export default function InstrumentsPage() {
  const [activeTab, setActiveTab] = useState('Forex');
  const activeItems = INSTRUMENTS[activeTab];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">

        {/* Hero */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <Link
              href="/platform"
              className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-400/80 transition-colors mb-8"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Platform overview
            </Link>
            <p className="t-eyebrow mb-4">Tradeable Universe</p>
            <h1 className="t-display-page mb-6">
              14 instruments across 4 asset classes.
            </h1>
            <p className="text-foreground/60 leading-relaxed mb-8 max-w-2xl">
              Each instrument is selected based on liquidity depth, spread efficiency,
              strategy compatibility, and historical performance characteristics. The
              platform does not trade thinly-traded or exotic instruments.
            </p>

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(INSTRUMENTS).map(([assetClass, items]) => (
                <div key={assetClass} className="card-enterprise text-center">
                  <p className="font-mono text-xl text-amber-400 mb-1">{items.length}</p>
                  <p className="t-body-sm text-foreground/60">{assetClass}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tab-based instrument browser */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">Asset Classes</p>
            <h2 className="t-display-sub mb-8">Browse instruments</h2>

            {/* Tab bar */}
            <div className="tab-bar mb-10" role="tablist">
              {ASSET_CLASSES.map((assetClass) => (
                <button
                  key={assetClass}
                  role="tab"
                  className={`tab-btn ${activeTab === assetClass ? 'active' : ''}`}
                  onClick={() => setActiveTab(assetClass)}
                  aria-selected={activeTab === assetClass}
                >
                  {assetClass}
                  <span className="ml-2 text-xs text-foreground/40">({INSTRUMENTS[assetClass].length})</span>
                </button>
              ))}
            </div>

            {/* Active tab content */}
            <div>
              <p className="text-foreground/60 leading-relaxed mb-8">
                {ASSET_CLASS_DESCRIPTIONS[activeTab]}
              </p>

              <div className="table-enterprise-wrapper">
                <table className="table-enterprise">
                  <thead>
                    <tr className="border-b border-white/8">
                      <th className="text-left px-6 py-3">Ticker</th>
                      <th className="text-left px-6 py-3">Instrument</th>
                      <th className="text-right px-6 py-3">Avg Spread</th>
                      <th className="text-left px-6 py-3 hidden md:table-cell">Trading Hours</th>
                      <th className="text-right px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeItems.map((inst) => (
                      <tr key={inst.ticker} className="border-b border-white/8 last:border-0">
                        <td className="font-mono px-6 py-3">{inst.ticker}</td>
                        <td className="px-6 py-3 text-foreground/60">{inst.name}</td>
                        <td className="font-mono text-right px-6 py-3">{inst.avgSpread}</td>
                        <td className="px-6 py-3 text-foreground/60 hidden md:table-cell">{inst.tradingHours}</td>
                        <td className="font-mono text-right px-6 py-3 text-amber-400">{inst.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Selection criteria */}
        <section className="section-padding">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">Inclusion Standards</p>
            <h2 className="t-display-sub mb-4">Selection criteria</h2>
            <div className="card-enterprise">
              <p className="text-foreground/60 leading-relaxed mb-4">
                Instruments are evaluated quarterly against four criteria before inclusion or
                removal from the active universe:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-foreground/60 text-sm">
                <li>
                  <span className="font-semibold text-foreground">Liquidity depth:</span>{' '}
                  Average daily volume must exceed minimum thresholds to ensure consistent
                  fill quality and manageable slippage.
                </li>
                <li>
                  <span className="font-semibold text-foreground">Spread efficiency:</span>{' '}
                  Average spread during active trading hours must remain below the
                  strategy-specific threshold to maintain positive expected value after
                  transaction costs.
                </li>
                <li>
                  <span className="font-semibold text-foreground">Strategy compatibility:</span>{' '}
                  The instrument must demonstrate technical characteristics (trending
                  behavior, mean-reversion, or event-driven patterns) compatible with at
                  least one active strategy.
                </li>
                <li>
                  <span className="font-semibold text-foreground">Historical performance:</span>{' '}
                  Backtested and walk-forward results for the instrument must meet minimum
                  performance thresholds (win rate, risk-reward ratio, drawdown limits) before
                  live deployment.
                </li>
              </ol>
            </div>
          </div>
        </section>

      </main>
      <EnterpriseFooter />
    </div>
  );
}
