import { Link } from '@/i18n/navigation';
import { Check, X, ArrowRight, ShieldAlert } from 'lucide-react';
import { TIERS, TIER_ORDER, tierAccentClasses, type TierName } from '@/lib/tiers/tier-config';
import { cn } from '@/lib/utils';

interface TierComparisonMatrixProps {
  locale: 'id' | 'en';
}

interface FeatureRow {
  key: string;
  labelKey: { id: string; en: string };
  /** Per tier, render value: true (check), false (x), or custom string */
  values: Record<TierName, true | false | string>;
}

const COPY = {
  id: {
    eyebrow: 'Matrix Tier — Robot Meta MT5',
    title: 'Bandingkan semua tier Robot Meta secara berdampingan',
    subtitle: 'Lima jalur untuk berbagai profil modal + risiko. Modal selalu di akun broker Anda — zero-custody.',
    label_min_equity: 'Modal minimum',
    label_monthly: 'Biaya bulanan',
    label_real_trading: 'Eksekusi live',
    label_paper_only: 'Paper / signal view saja',
    label_strategies: 'Strategi aktif',
    label_pairs: 'Aset',
    label_pair_unlimited: 'Unlimited (custom allow-list)',
    label_ai_mode: 'AI Brain',
    label_ai_shadow: 'Shadow — observe only',
    label_ai_live: 'Live — execute',
    label_ai_adjust: 'Adjust — mutation',
    label_kelly: 'Kelly position sizing',
    label_custom_allow: 'Custom pair allow-list',
    cta_register: 'Pilih',
    cta_contact: 'Konsultasi',
    cta_explore: 'Lihat fitur lengkap',
    sign_check: 'Termasuk',
    sign_x: 'Tidak termasuk',
    pending_badge: 'Backend pending',
    pending_note: 'Tier `micro` belum tersedia sebagai self-service SKU di backend — saat ini akses via konsultasi langsung dengan tim. SKU otomatis dirilis di fase berikutnya.',
    free_label: 'Gratis',
    none_label: 'Tidak ada',
    monthly_suffix: 'bulan',
    cta_try_demo: 'Coba Demo',
  },
  en: {
    eyebrow: 'Tier Matrix — Forex Robot MT5',
    title: 'Compare every Forex Robot tier side by side',
    subtitle: 'Five paths for different capital and risk profiles. Capital always stays in your broker account — zero custody.',
    label_min_equity: 'Minimum equity',
    label_monthly: 'Monthly fee',
    label_real_trading: 'Live execution',
    label_paper_only: 'Paper / signal view only',
    label_strategies: 'Active strategies',
    label_pairs: 'Assets',
    label_pair_unlimited: 'Unlimited (custom allow-list)',
    label_ai_mode: 'AI Brain',
    label_ai_shadow: 'Shadow — observe only',
    label_ai_live: 'Live — execute',
    label_ai_adjust: 'Adjust — mutation',
    label_kelly: 'Kelly position sizing',
    label_custom_allow: 'Custom pair allow-list',
    cta_register: 'Choose',
    cta_contact: 'Talk to us',
    cta_explore: 'See all features',
    sign_check: 'Included',
    sign_x: 'Not included',
    pending_badge: 'Backend pending',
    pending_note: 'The `micro` tier is not yet available as a self-service SKU — currently accessible through direct consultation. The automated SKU ships in the next phase.',
    free_label: 'Free',
    none_label: 'None',
    monthly_suffix: 'mo',
    cta_try_demo: 'Try Demo',
  },
} as const;

export function TierComparisonMatrix({ locale }: TierComparisonMatrixProps) {
  const t = COPY[locale];

  function formatPrice(monthlyPrice: number): string {
    if (monthlyPrice === 0) return t.free_label;
    return `$${monthlyPrice}/${t.monthly_suffix}`;
  }

  function formatEquity(min: number): string {
    if (min === 0) return t.none_label;
    return `$${min.toLocaleString(locale === 'id' ? 'id-ID' : 'en-US')}`;
  }

  function aiModeLabel(mode: 'shadow' | 'live' | 'adjust'): string {
    if (mode === 'shadow') return t.label_ai_shadow;
    if (mode === 'live') return t.label_ai_live;
    return t.label_ai_adjust;
  }

  function ctaForTier(name: TierName): { href: string; label: string } {
    if (name === 'free') return { href: '/demo?product=robot-meta', label: t.cta_try_demo };
    if (name === 'micro') return { href: '/contact?subject=tier-micro', label: t.cta_contact };
    if (name === 'starter') return { href: '/register/signal?tier=starter', label: t.cta_register };
    if (name === 'pro') return { href: '/register/signal?tier=pro', label: t.cta_register };
    return { href: '/contact?subject=tier-vip', label: t.cta_contact };
  }

  // Build feature rows from TIERS config
  const featureRows: FeatureRow[] = [
    {
      key: 'min_equity',
      labelKey: { id: t.label_min_equity, en: t.label_min_equity },
      values: Object.fromEntries(TIER_ORDER.map((tName) => [tName, formatEquity(TIERS[tName].minEquity)])) as Record<TierName, string>,
    },
    {
      key: 'monthly',
      labelKey: { id: t.label_monthly, en: t.label_monthly },
      values: Object.fromEntries(TIER_ORDER.map((tName) => [tName, formatPrice(TIERS[tName].monthlyPrice)])) as Record<TierName, string>,
    },
    {
      key: 'real_trading',
      labelKey: { id: t.label_real_trading, en: t.label_real_trading },
      values: Object.fromEntries(TIER_ORDER.map((tName) => [tName, TIERS[tName].realTrading])) as Record<TierName, true | false>,
    },
    {
      key: 'strategies',
      labelKey: { id: t.label_strategies, en: t.label_strategies },
      values: Object.fromEntries(TIER_ORDER.map((tName) => [tName, `${TIERS[tName].strategies.length}`])) as Record<TierName, string>,
    },
    {
      key: 'pairs',
      labelKey: { id: t.label_pairs, en: t.label_pairs },
      values: Object.fromEntries(TIER_ORDER.map((tName) => {
        const cfg = TIERS[tName];
        return [tName, cfg.pairs.length === 0 ? (cfg.customAllowList ? t.label_pair_unlimited : '—') : `${cfg.pairs.length}`];
      })) as Record<TierName, string>,
    },
    {
      key: 'ai_mode',
      labelKey: { id: t.label_ai_mode, en: t.label_ai_mode },
      values: Object.fromEntries(TIER_ORDER.map((tName) => [tName, aiModeLabel(TIERS[tName].aiMode)])) as Record<TierName, string>,
    },
    {
      key: 'kelly',
      labelKey: { id: t.label_kelly, en: t.label_kelly },
      values: Object.fromEntries(TIER_ORDER.map((tName) => [tName, TIERS[tName].kelly])) as Record<TierName, true | false>,
    },
    {
      key: 'custom_allow',
      labelKey: { id: t.label_custom_allow, en: t.label_custom_allow },
      values: Object.fromEntries(TIER_ORDER.map((tName) => [tName, TIERS[tName].customAllowList])) as Record<TierName, true | false>,
    },
  ];

  return (
    <div className="rounded-2xl border border-border/70 bg-card/40 overflow-hidden">
      {/* Header strip */}
      <div className="px-5 py-5 sm:px-7 sm:py-6 border-b border-border/60 bg-gradient-to-br from-amber-500/[0.04] to-transparent">
        <p className="t-eyebrow text-amber-600 dark:text-amber-400 mb-2">{t.eyebrow}</p>
        <h2 className="t-display-sub text-foreground leading-tight mb-2">{t.title}</h2>
        <p className="t-body-sm text-muted-foreground max-w-3xl">{t.subtitle}</p>
      </div>

      {/* Desktop matrix (md+) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30">
              <th className="text-left p-4 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground sticky left-0 bg-muted/30 z-10 min-w-[200px]">
                {locale === 'id' ? 'Fitur' : 'Feature'}
              </th>
              {TIER_ORDER.map((tName) => {
                const cfg = TIERS[tName];
                const accent = tierAccentClasses(cfg.accent);
                return (
                  <th key={tName} className="p-4 text-center min-w-[140px]">
                    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ring-1', accent.bg, accent.text, accent.ring)}>
                      {tName}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {featureRows.map((row) => (
              <tr key={row.key} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                <td className="p-4 font-medium text-foreground/85 sticky left-0 bg-background z-10">{row.labelKey[locale]}</td>
                {TIER_ORDER.map((tName) => {
                  const v = row.values[tName];
                  return (
                    <td key={tName} className="p-4 text-center">
                      {v === true ? (
                        <Check className="h-4 w-4 mx-auto text-[hsl(var(--profit))]" strokeWidth={2.25} aria-label={t.sign_check} />
                      ) : v === false ? (
                        <X className="h-4 w-4 mx-auto text-muted-foreground/50" strokeWidth={2} aria-label={t.sign_x} />
                      ) : (
                        <span className="text-foreground/85 font-mono text-xs">{v}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* CTA row */}
            <tr className="bg-muted/20">
              <td className="p-4 font-medium text-foreground/85 sticky left-0 bg-muted/20 z-10">
                {locale === 'id' ? 'Aksi' : 'Action'}
              </td>
              {TIER_ORDER.map((tName) => {
                const cta = ctaForTier(tName);
                return (
                  <td key={tName} className="p-4 text-center">
                    <Link
                      href={cta.href}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border border-border hover:border-amber-500/40 hover:bg-amber-500/[0.06] transition-colors"
                    >
                      {cta.label}
                      <ArrowRight className="h-3 w-3" strokeWidth={2.25} />
                    </Link>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards (< md) */}
      <div className="md:hidden divide-y divide-border/60">
        {TIER_ORDER.map((tName) => {
          const cfg = TIERS[tName];
          const accent = tierAccentClasses(cfg.accent);
          const cta = ctaForTier(tName);
          return (
            <div key={tName} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ring-1', accent.bg, accent.text, accent.ring)}>
                  {tName}
                </span>
                <span className="font-mono text-sm font-semibold text-foreground">{formatPrice(cfg.monthlyPrice)}</span>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <dt className="text-muted-foreground">{t.label_min_equity}</dt>
                <dd className="text-foreground font-mono text-right">{formatEquity(cfg.minEquity)}</dd>
                <dt className="text-muted-foreground">{t.label_real_trading}</dt>
                <dd className="text-foreground text-right">{cfg.realTrading ? '✓' : '—'}</dd>
                <dt className="text-muted-foreground">{t.label_strategies}</dt>
                <dd className="text-foreground font-mono text-right">{cfg.strategies.length}</dd>
                <dt className="text-muted-foreground">{t.label_pairs}</dt>
                <dd className="text-foreground font-mono text-right">{cfg.pairs.length === 0 ? (cfg.customAllowList ? '∞' : '—') : cfg.pairs.length}</dd>
                <dt className="text-muted-foreground">{t.label_ai_mode}</dt>
                <dd className="text-foreground text-right text-[11px]">{aiModeLabel(cfg.aiMode)}</dd>
                <dt className="text-muted-foreground">{t.label_kelly}</dt>
                <dd className="text-foreground text-right">{cfg.kelly ? '✓' : '—'}</dd>
                <dt className="text-muted-foreground">{t.label_custom_allow}</dt>
                <dd className="text-foreground text-right">{cfg.customAllowList ? '✓' : '—'}</dd>
              </dl>
              <Link
                href={cta.href}
                className="inline-flex items-center justify-center gap-1.5 w-full h-10 rounded-md text-xs font-medium border border-border hover:border-amber-500/40 hover:bg-amber-500/[0.06] transition-colors"
              >
                {cta.label}
                <ArrowRight className="h-3 w-3" strokeWidth={2.25} />
              </Link>
            </div>
          );
        })}
      </div>

      {/* Pending note for micro tier */}
      <div className="px-5 py-4 sm:px-7 border-t border-border/60 bg-amber-500/[0.04]">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" strokeWidth={2} aria-hidden />
          <div className="text-xs leading-relaxed">
            <span className="inline-block mr-2 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300">
              {t.pending_badge}
            </span>
            <span className="text-foreground/80">{t.pending_note}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
