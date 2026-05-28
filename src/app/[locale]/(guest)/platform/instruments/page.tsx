'use client';

import { useState } from 'react';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { TrustStrip } from '@/components/shared/trust-strip';
import { StickyCtaBar } from '@/components/shared/sticky-cta-bar';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FOREX_PAIRS_LIVE, FOREX_PAIRS_SHADOW } from '@/lib/trading/product-info';

type AssetClassKey = 'forex' | 'metals' | 'energy' | 'crypto';

interface Instrument {
  ticker: string;
  nameKey: string;
  hoursKey: string;
  /** 'active' = LIVE traded pair; 'monitoring' = SHADOW (observed, not executed). */
  status: 'active' | 'monitoring';
}

// Asset-class + trading-hours derived per ticker. Everything else is Forex.
const ASSET_CLASS_OF: Record<string, AssetClassKey> = {
  XAUUSD: 'metals', XAGUSD: 'metals',
  USOIL: 'energy', UKOIL: 'energy', XNGUSD: 'energy',
  BTCUSD: 'crypto', ETHUSD: 'crypto',
};
const HOURS_KEY_OF: Record<string, string> = {
  USOIL: 'hours_usoil', UKOIL: 'hours_ukoil', XNGUSD: 'hours_xngusd',
};

function assetClassOf(ticker: string): AssetClassKey {
  return ASSET_CLASS_OF[ticker] ?? 'forex';
}
function hoursKeyOf(ticker: string, cls: AssetClassKey): string {
  return HOURS_KEY_OF[ticker]
    ?? (cls === 'metals' ? 'hours_metals' : cls === 'crypto' ? 'hours_crypto' : 'hours_forex');
}

// Single source of truth: derive the universe from product-info LIVE/SHADOW lists
// instead of a hand-maintained table that drifted (shadow pairs shown "Active",
// live pairs missing, fabricated spreads). (P1-DI-6, P2-DI-3, P2-DI-4)
function buildInstruments(): Record<AssetClassKey, Instrument[]> {
  const out: Record<AssetClassKey, Instrument[]> = { forex: [], metals: [], energy: [], crypto: [] };
  const add = (ticker: string, status: Instrument['status']) => {
    const cls = assetClassOf(ticker);
    out[cls].push({ ticker, nameKey: `instrument_${ticker}_name`, hoursKey: hoursKeyOf(ticker, cls), status });
  };
  FOREX_PAIRS_LIVE.forEach((t) => add(t, 'active'));
  FOREX_PAIRS_SHADOW.forEach((t) => add(t, 'monitoring'));
  return out;
}
const INSTRUMENTS = buildInstruments();
const TOTAL_INSTRUMENTS = Object.values(INSTRUMENTS).reduce((n, list) => n + list.length, 0);

const ASSET_CLASS_KEYS: AssetClassKey[] = ['forex', 'metals', 'energy', 'crypto'];

const ASSET_CLASS_LABEL_KEYS: Record<AssetClassKey, string> = {
  forex: 'asset_class_forex',
  metals: 'asset_class_metals',
  energy: 'asset_class_energy',
  crypto: 'asset_class_crypto',
};

const ASSET_CLASS_DESC_KEYS: Record<AssetClassKey, string> = {
  forex: 'desc_forex',
  metals: 'desc_metals',
  energy: 'desc_energy',
  crypto: 'desc_crypto',
};

export default function InstrumentsPage() {
  const t = useTranslations('platform_instruments');
  const [activeTab, setActiveTab] = useState<AssetClassKey>('forex');
  const activeItems = INSTRUMENTS[activeTab];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">

        {/* Hero */}
        <section className="section-padding border-b border-white/8">
          <div className="layout-container">
            <Link
              href="/platform"
              className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-400/80 transition-colors mb-8"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {t('back_link')}
            </Link>
            <div className="hero-section-header">
              <p className="t-eyebrow mb-4">{t('hero_eyebrow')}</p>
              <h1 className="t-display-page mb-6">
                {t('hero_title', { count: TOTAL_INSTRUMENTS })}
              </h1>
              <p className="text-foreground/60 leading-relaxed mb-8">
                {t('hero_lead')}
              </p>
              <div className="mb-8">
                <TrustStrip />
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {ASSET_CLASS_KEYS.map((key) => (
                <div key={key} className="card-enterprise text-center">
                  <p className="font-mono text-xl text-amber-400 mb-1">{INSTRUMENTS[key].length}</p>
                  <p className="t-body-sm text-foreground/60">{t(ASSET_CLASS_LABEL_KEYS[key])}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tab-based instrument browser */}
        <section className="section-padding border-b border-white/8">
          <div className="layout-container">
            <p className="t-eyebrow mb-4">{t('browse_eyebrow')}</p>
            <h2 className="t-display-sub mb-8">{t('browse_title')}</h2>

            {/* Tab bar */}
            <div className="overflow-x-auto mb-10">
            <div className="tab-bar" role="tablist">
              {ASSET_CLASS_KEYS.map((key) => (
                <button
                  key={key}
                  role="tab"
                  className={`tab-btn ${activeTab === key ? 'active' : ''}`}
                  onClick={() => setActiveTab(key)}
                  aria-selected={activeTab === key}
                >
                  {t(ASSET_CLASS_LABEL_KEYS[key])}
                  <span className="ml-2 text-xs text-foreground/40">({INSTRUMENTS[key].length})</span>
                </button>
              ))}
            </div>
            </div>

            {/* Active tab content */}
            <div>
              <p className="text-foreground/60 leading-relaxed mb-8">
                {t(ASSET_CLASS_DESC_KEYS[activeTab])}
              </p>

              <div className="overflow-x-auto">
                <div className="table-enterprise-wrapper min-w-[560px]">
                <table className="table-enterprise">
                  <thead>
                    <tr className="border-b border-white/8">
                      <th className="text-left px-6 py-3">{t('table_ticker')}</th>
                      <th className="text-left px-6 py-3">{t('table_instrument')}</th>
                      <th className="text-left px-6 py-3 hidden md:table-cell">{t('table_trading_hours')}</th>
                      <th className="text-right px-6 py-3">{t('table_status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeItems.map((inst) => (
                      <tr key={inst.ticker} className="border-b border-white/8 last:border-0">
                        <td className="font-mono px-6 py-3">{inst.ticker}</td>
                        <td className="px-6 py-3 text-foreground/60">{t(inst.nameKey)}</td>
                        <td className="px-6 py-3 text-foreground/60 hidden md:table-cell">{t(inst.hoursKey)}</td>
                        <td className="font-mono text-right px-6 py-3">
                          {inst.status === 'active' ? (
                            <span className="text-amber-400">{t('status_active')}</span>
                          ) : (
                            <span className="text-foreground/45">{t('status_monitoring')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>

              <p className="mt-4 text-xs text-foreground/45">{t('status_legend')}</p>
            </div>
          </div>
        </section>

        {/* Selection criteria */}
        <section className="section-padding">
          <div className="layout-container">
            <p className="t-eyebrow mb-4">{t('criteria_eyebrow')}</p>
            <h2 className="t-display-sub mb-4">{t('criteria_title')}</h2>
            <div className="card-enterprise">
              <p className="text-foreground/60 leading-relaxed mb-4">
                {t('criteria_intro')}
              </p>
              <ol className="list-decimal list-inside space-y-2 text-foreground/60 text-sm">
                <li>
                  <span className="font-semibold text-foreground">{t('criteria_liquidity_label')}</span>{' '}
                  {t('criteria_liquidity_body')}
                </li>
                <li>
                  <span className="font-semibold text-foreground">{t('criteria_spread_label')}</span>{' '}
                  {t('criteria_spread_body')}
                </li>
                <li>
                  <span className="font-semibold text-foreground">{t('criteria_compatibility_label')}</span>{' '}
                  {t('criteria_compatibility_body')}
                </li>
                <li>
                  <span className="font-semibold text-foreground">{t('criteria_performance_label')}</span>{' '}
                  {t('criteria_performance_body')}
                </li>
              </ol>
            </div>
          </div>
        </section>

        <InstrumentsStickyCta />
      </main>
      <EnterpriseFooter />
    </div>
  );
}

function InstrumentsStickyCta() {
  const ts = useTranslations('shared');
  return (
    <StickyCtaBar
      message={ts('sticky_demo_text')}
      ctaLabel={ts('sticky_demo_cta')}
      href="/register?service=free"
    />
  );
}
