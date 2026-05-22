'use client';

/**
 * SubscriptionRequiredEmpty — institutional-grade empty state untuk portal
 * pages yang require active subscription.
 *
 * Pak Abdullah audit 2026-05-22: "tombol harus langganan atau solusi lain
 * agar user tau halaman belum tersedia, buat standart institusional".
 *
 * Pattern:
 *   <SubscriptionRequiredEmpty
 *     feature="positions"
 *     description="Akses live trading positions dengan subscription aktif."
 *   />
 *
 * Behavior:
 *   - Show lock icon + premium gradient accent
 *   - Bilingual via locale prop atau auto-detect via useLocale
 *   - Primary CTA "Lihat Paket" → /pricing
 *   - Secondary CTA "Tanya Tim" → /contact
 *   - Shop link to /portal anchor #shop-products untuk inline browse
 */
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Lock, ArrowRight, ShoppingBag, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubscriptionRequiredEmptyProps {
  /** Feature label untuk title (e.g. "positions", "performance", "signals") */
  feature?: string;
  /** Optional bilingual description override */
  description?: { id: string; en: string };
  /** Variant: 'full' (page-level empty state) | 'compact' (inline card) */
  variant?: 'full' | 'compact';
  /** Hide secondary CTA (helpful when nested inside complex layouts) */
  hideSecondary?: boolean;
}

const DEFAULT_DESC = {
  id: 'Akses data live trading, analytics performance, dan kontrol risk memerlukan subscription aktif. Pilih paket yang sesuai modal & strategi Anda.',
  en: 'Access to live trading data, performance analytics, and risk controls requires an active subscription. Choose the plan that matches your capital & strategy.',
};

const FEATURE_LABELS: Record<string, { id: string; en: string }> = {
  positions: { id: 'Posisi Live', en: 'Live Positions' },
  performance: { id: 'Analytics Performance', en: 'Performance Analytics' },
  trades: { id: 'Riwayat Trade', en: 'Trade History' },
  signals: { id: 'Signal Audit', en: 'Signal Audit' },
  scanner: { id: 'Market Scanner', en: 'Market Scanner' },
  calendar: { id: 'Economic Calendar', en: 'Economic Calendar' },
  reports: { id: 'Reports', en: 'Reports' },
  notifications: { id: 'Notifikasi', en: 'Notifications' },
  'kill-switch': { id: 'Kill Switch Control', en: 'Kill Switch Control' },
  default: { id: 'Data Premium', en: 'Premium Data' },
};

export function SubscriptionRequiredEmpty({
  feature = 'default',
  description,
  variant = 'full',
  hideSecondary = false,
}: SubscriptionRequiredEmptyProps) {
  const locale = useLocale();
  const isEn = locale === 'en';
  const featLabel = FEATURE_LABELS[feature] ?? FEATURE_LABELS.default;
  const desc = description ?? DEFAULT_DESC;

  const title = isEn
    ? `${featLabel.en} — Subscription Required`
    : `${featLabel.id} — Butuh Langganan`;

  const bodyText = isEn ? desc.en : desc.id;

  if (variant === 'compact') {
    return (
      <div className={cn(
        'rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.06] via-amber-500/[0.03] to-transparent',
        'p-4 sm:p-5 flex items-start gap-4',
      )}>
        <div className="rounded-lg bg-amber-500/15 border border-amber-500/30 p-2.5 shrink-0">
          <Lock className="h-5 w-5 text-amber-500" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold mb-1 text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">{bodyText}</p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-950 transition-colors"
          >
            {isEn ? 'View Plans' : 'Lihat Paket'}
            <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </div>
    );
  }

  // Full variant — institutional page-level empty state
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl border border-amber-500/20',
      'bg-gradient-to-br from-amber-500/[0.06] via-amber-500/[0.02] to-transparent',
      'p-8 sm:p-12 text-center',
    )}>
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-32 left-1/4 h-48 w-48 rounded-full bg-amber-500/[0.05] blur-3xl" aria-hidden />

      <div className="relative">
        {/* Icon */}
        <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 ring-4 ring-amber-500/[0.05]">
          <Lock className="h-7 w-7 text-amber-500" aria-hidden />
        </div>

        {/* Eyebrow */}
        <div className="text-[11px] uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400 font-bold mb-2">
          {isEn ? 'Premium Feature' : 'Fitur Premium'}
        </div>

        {/* Title */}
        <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-3 max-w-md mx-auto leading-tight">
          {title}
        </h2>

        {/* Description */}
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-lg mx-auto mb-6">
          {bodyText}
        </p>

        {/* Primary CTA */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center max-w-md mx-auto">
          <Link
            href="/pricing"
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-lg',
              'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300',
              'px-5 py-3 text-sm font-bold text-amber-950',
              'shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all',
              'hover:scale-[1.02] active:scale-[0.98]',
            )}
          >
            <ShoppingBag className="h-4 w-4" aria-hidden />
            {isEn ? 'Choose a Plan' : 'Pilih Paket'}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>

          {!hideSecondary && (
            <Link
              href="/contact"
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-lg',
                'border border-border bg-card/50 hover:bg-card',
                'px-5 py-3 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors',
              )}
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              {isEn ? 'Talk to Sales' : 'Tanya Tim'}
            </Link>
          )}
        </div>

        {/* Fine print */}
        <p className="mt-6 text-[11px] text-muted-foreground/60 leading-relaxed">
          {isEn
            ? 'Free 30-day demo available · Cancel anytime · No long-term commitment'
            : 'Tersedia demo gratis 30 hari · Bisa cancel kapan saja · Tanpa komitmen jangka panjang'}
        </p>
      </div>
    </div>
  );
}
