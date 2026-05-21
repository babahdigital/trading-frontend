/**
 * CryptoTierGate — onboarding step yang ambil deposit USDT user lalu
 * recommend tier (rc29 logic).
 *
 * Behavior:
 *   - Input numeric (deposit USDT)
 *   - Live compute via recommendTier(deposit)
 *   - Display tier recommendation card dengan: name, fee, slot, leverage,
 *     sweet spot, fee %profit, verdict (sweet/edge/optimal/force_demo)
 *   - CTA: "Pilih Tier X" → callback parent (atau navigate ke /register?tier=X)
 *
 * Force gate: kalau verdict='force_demo' (deposit <$500), satu-satunya CTA
 * adalah "Mulai Free Demo". User TIDAK bisa skip tier ini ke paid — backend
 * akan reject karena fee disproportionate.
 *
 * Bilingual (id + en) via prop `locale`.
 */
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Calculator, ArrowRight, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { recommendTier, tierDisplayName, type TierRecommendation } from '@/lib/crypto/recommend-tier';

export interface CryptoTierGateProps {
  locale?: 'id' | 'en';
  /** Optional initial deposit pre-fill (e.g. dari URL query param). */
  initialDeposit?: number;
  /** Custom href base — default /register?service=crypto&tier=X */
  ctaBaseHref?: string;
  /** Callback saat user pilih tier (alternative ke ctaBaseHref). */
  onSelectTier?: (rec: TierRecommendation) => void;
}

const COPY = {
  id: {
    eyebrow: 'Wizard Onboarding',
    title: 'Berapa modal yang Anda siapkan?',
    subtitle: 'Kami akan rekomendasikan tier yang paling efisien — fee proporsional dengan ekspektasi profit, bukan over-pay.',
    label_input: 'Modal dalam USDT',
    placeholder: 'Contoh: 1500',
    fee: 'Biaya bulanan',
    slots: 'Slot simultan',
    leverage: 'Leverage maks',
    risk: 'Risk per trade',
    sweet_spot: 'Sweet spot',
    expected_profit: 'Estimasi profit @ 5%/bulan',
    fee_pct: 'Fee % dari profit',
    cta_demo: 'Mulai Free Demo 30 Hari',
    cta_paid: (tier: string) => `Pilih Tier ${tier}`,
    verdict: {
      optimal: { label: 'OPTIMAL', tone: 'success' as const },
      sweet: { label: 'SWEET SPOT', tone: 'success' as const },
      edge: { label: 'EDGE — pertimbangkan topup', tone: 'warning' as const },
      force_demo: { label: 'GRATIS', tone: 'info' as const },
    },
    rate_disclaimer: 'Estimasi profit menggunakan benchmark industri 5% rata-rata bulanan crypto algo trading. Hasil aktual bergantung pada kondisi pasar.',
  },
  en: {
    eyebrow: 'Onboarding Wizard',
    title: 'How much capital are you starting with?',
    subtitle: 'We will recommend the most efficient tier — fee proportional to expected profit, not over-pay.',
    label_input: 'Capital in USDT',
    placeholder: 'Example: 1500',
    fee: 'Monthly fee',
    slots: 'Concurrent slots',
    leverage: 'Max leverage',
    risk: 'Risk per trade',
    sweet_spot: 'Sweet spot',
    expected_profit: 'Estimated profit @ 5%/mo',
    fee_pct: 'Fee % of profit',
    cta_demo: 'Start 30-Day Free Demo',
    cta_paid: (tier: string) => `Choose ${tier} Tier`,
    verdict: {
      optimal: { label: 'OPTIMAL', tone: 'success' as const },
      sweet: { label: 'SWEET SPOT', tone: 'success' as const },
      edge: { label: 'EDGE — consider top up', tone: 'warning' as const },
      force_demo: { label: 'FREE', tone: 'info' as const },
    },
    rate_disclaimer: 'Profit estimates use industry benchmark of 5% monthly average for crypto algo trading. Actual results depend on market conditions.',
  },
} as const;

const TONE_CLASS = {
  success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30',
  info:    'bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500/30',
  danger:  'bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/30',
};

export function CryptoTierGate({
  locale = 'id',
  initialDeposit = 0,
  ctaBaseHref = '/register?service=crypto',
  onSelectTier,
}: CryptoTierGateProps) {
  const copy = COPY[locale];
  const [deposit, setDeposit] = useState<string>(initialDeposit > 0 ? String(initialDeposit) : '');
  const depositNum = useMemo(() => {
    const n = parseFloat(deposit.replace(/[,\s]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }, [deposit]);

  const rec = useMemo(() => recommendTier(depositNum), [depositNum]);
  const verdictMeta = copy.verdict[rec.verdict];
  const tierName = tierDisplayName(rec.tier, locale);

  const ctaHref = rec.tier === 'free_demo'
    ? `${ctaBaseHref}&tier=demo`
    : `${ctaBaseHref}&tier=${rec.tier}&deposit=${depositNum}`;
  const ctaLabel = rec.tier === 'free_demo' ? copy.cta_demo : copy.cta_paid(tierName);

  return (
    <div className="card-enterprise max-w-3xl mx-auto">
      <header className="mb-6">
        <p className="t-eyebrow mb-2">{copy.eyebrow}</p>
        <h2 className="text-2xl sm:text-3xl font-semibold mb-2">{copy.title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{copy.subtitle}</p>
      </header>

      {/* Input */}
      <div className="mb-6">
        <label htmlFor="deposit" className="text-sm font-medium block mb-2">
          {copy.label_input}
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/60 font-mono text-sm select-none">$</span>
          <input
            id="deposit"
            type="number"
            inputMode="decimal"
            min={0}
            step={100}
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
            placeholder={copy.placeholder}
            className="w-full h-12 pl-7 pr-16 rounded-md border border-input bg-background text-base font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={copy.label_input}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 font-mono text-xs uppercase select-none">USDT</span>
        </div>
      </div>

      {/* Recommendation card */}
      {depositNum > 0 ? (
        <div className={cn(
          'rounded-lg p-5 mb-5 transition-colors',
          rec.tier === 'free_demo' ? 'bg-sky-500/5 border border-sky-500/20' : 'bg-amber-500/5 border border-amber-500/30',
        )}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calculator className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">{copy.eyebrow}</span>
              </div>
              <h3 className="text-xl font-semibold">{tierName}</h3>
            </div>
            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', TONE_CLASS[verdictMeta.tone])}>
              {verdictMeta.label}
            </span>
          </div>

          {/* Tier KPI grid */}
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 text-xs">
            <KpiCell label={copy.fee} value={rec.fee_usd === 0 ? 'GRATIS' : `$${rec.fee_usd}/mo`} />
            <KpiCell label={copy.slots} value={`${rec.max_slots}`} />
            <KpiCell label={copy.leverage} value={rec.max_leverage} />
            <KpiCell label={copy.risk} value={rec.risk_per_trade} />
            <KpiCell label={copy.expected_profit} value={`$${rec.expected_profit_5pct_usd}`} />
            <KpiCell
              label={copy.fee_pct}
              value={rec.fee_pct_of_profit > 0 ? `${rec.fee_pct_of_profit}%` : '—'}
              tone={rec.fee_pct_of_profit > 30 ? 'warning' : rec.fee_pct_of_profit > 0 ? 'success' : 'default'}
            />
          </dl>

          {/* Rationale */}
          <p className="text-sm text-foreground/80 leading-relaxed mb-3">
            {rec.rationale[locale]}
          </p>

          {/* Message — actionable next step */}
          <div className="flex items-start gap-2 text-xs text-foreground/65 leading-relaxed">
            {rec.verdict === 'edge' ? <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />}
            <span>{rec.message[locale]}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-lg p-5 mb-5 bg-muted/30 border border-border/40 text-center text-sm text-muted-foreground">
          <TrendingUp className="w-5 h-5 mx-auto mb-2 text-muted-foreground/50" />
          {locale === 'id' ? 'Masukkan jumlah modal untuk lihat rekomendasi tier.' : 'Enter your capital to see tier recommendation.'}
        </div>
      )}

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        {onSelectTier ? (
          <button
            type="button"
            onClick={() => onSelectTier(rec)}
            disabled={depositNum === 0}
            className="btn-primary inline-flex flex-1 items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {ctaLabel} <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <Link
            href={depositNum > 0 ? ctaHref : '#'}
            className={cn(
              'btn-primary inline-flex flex-1 items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium',
              depositNum === 0 && 'opacity-50 cursor-not-allowed pointer-events-none',
            )}
            aria-disabled={depositNum === 0}
          >
            {ctaLabel} <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground/70 mt-4 leading-relaxed">
        {copy.rate_disclaimer}
      </p>
    </div>
  );
}

function KpiCell({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning';
}) {
  const valueClass = {
    default: 'text-foreground',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
  }[tone];
  return (
    <div>
      <dt className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono mb-0.5">{label}</dt>
      <dd className={cn('text-sm font-semibold font-mono tabular-nums', valueClass)}>{value}</dd>
    </div>
  );
}
