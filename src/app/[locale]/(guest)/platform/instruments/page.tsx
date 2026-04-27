'use client';

import { useState } from 'react';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

type AssetClassKey = 'forex' | 'metals' | 'energy' | 'crypto';

interface Instrument {
  ticker: string;
  nameKey: string;
  avgSpread: string;
  hoursKey: string;
}

const INSTRUMENTS: Record<AssetClassKey, Instrument[]> = {
  forex: [
    { ticker: 'EURUSD', nameKey: 'instrument_EURUSD_name', avgSpread: '0.8 pip', hoursKey: 'hours_forex' },
    { ticker: 'GBPUSD', nameKey: 'instrument_GBPUSD_name', avgSpread: '1.0 pip', hoursKey: 'hours_forex' },
    { ticker: 'USDJPY', nameKey: 'instrument_USDJPY_name', avgSpread: '0.9 pip', hoursKey: 'hours_forex' },
    { ticker: 'AUDUSD', nameKey: 'instrument_AUDUSD_name', avgSpread: '1.1 pip', hoursKey: 'hours_forex' },
    { ticker: 'USDCHF', nameKey: 'instrument_USDCHF_name', avgSpread: '1.2 pip', hoursKey: 'hours_forex' },
    { ticker: 'NZDUSD', nameKey: 'instrument_NZDUSD_name', avgSpread: '1.3 pip', hoursKey: 'hours_forex' },
    { ticker: 'USDCAD', nameKey: 'instrument_USDCAD_name', avgSpread: '1.4 pip', hoursKey: 'hours_forex' },
  ],
  metals: [
    { ticker: 'XAUUSD', nameKey: 'instrument_XAUUSD_name', avgSpread: '2.5 pip', hoursKey: 'hours_metals' },
    { ticker: 'XAGUSD', nameKey: 'instrument_XAGUSD_name', avgSpread: '3.0 pip', hoursKey: 'hours_metals' },
  ],
  energy: [
    { ticker: 'USOIL', nameKey: 'instrument_USOIL_name', avgSpread: '3.5 pip', hoursKey: 'hours_usoil' },
    { ticker: 'UKOIL', nameKey: 'instrument_UKOIL_name', avgSpread: '4.0 pip', hoursKey: 'hours_ukoil' },
    { ticker: 'XNGUSD', nameKey: 'instrument_XNGUSD_name', avgSpread: '5.0 pip', hoursKey: 'hours_xngusd' },
  ],
  crypto: [
    { ticker: 'BTCUSD', nameKey: 'instrument_BTCUSD_name', avgSpread: '15.0 pip', hoursKey: 'hours_crypto' },
    { ticker: 'ETHUSD', nameKey: 'instrument_ETHUSD_name', avgSpread: '8.0 pip', hoursKey: 'hours_crypto' },
  ],
};

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
          <div className="container-default px-4 sm:px-6">
            <Link
              href="/platform"
              className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-400/80 transition-colors mb-8"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {t('back_link')}
            </Link>
            <p className="t-eyebrow mb-4">{t('hero_eyebrow')}</p>
            <h1 className="t-display-page mb-6">
              {t('hero_title')}
            </h1>
            <p className="text-foreground/60 leading-relaxed mb-8 max-w-2xl">
              {t('hero_lead')}
            </p>

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
          <div className="container-default px-4 sm:px-6">
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
                <div className="table-enterprise-wrapper min-w-[600px]">
                <table className="table-enterprise">
                  <thead>
                    <tr className="border-b border-white/8">
                      <th className="text-left px-6 py-3">{t('table_ticker')}</th>
                      <th className="text-left px-6 py-3">{t('table_instrument')}</th>
                      <th className="text-right px-6 py-3">{t('table_avg_spread')}</th>
                      <th className="text-left px-6 py-3 hidden md:table-cell">{t('table_trading_hours')}</th>
                      <th className="text-right px-6 py-3">{t('table_status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeItems.map((inst) => (
                      <tr key={inst.ticker} className="border-b border-white/8 last:border-0">
                        <td className="font-mono px-6 py-3">{inst.ticker}</td>
                        <td className="px-6 py-3 text-foreground/60">{t(inst.nameKey)}</td>
                        <td className="font-mono text-right px-6 py-3">{inst.avgSpread}</td>
                        <td className="px-6 py-3 text-foreground/60 hidden md:table-cell">{t(inst.hoursKey)}</td>
                        <td className="font-mono text-right px-6 py-3 text-amber-400">{t('status_active')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Selection criteria */}
        <section className="section-padding">
          <div className="container-default px-4 sm:px-6">
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

      </main>
      <EnterpriseFooter />
    </div>
  );
}
