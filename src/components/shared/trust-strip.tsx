'use client';

/**
 * Shared trust strip — 3 jaminan utama untuk surface customer-facing.
 *
 * Dipakai di /register, /pricing, /demo, dan landing untuk konsistensi.
 * Default copy via shared.trust.* namespace i18n; bisa override per
 * surface dengan menyediakan items prop kalau butuh variant.
 */
import { useTranslations } from 'next-intl';
import { ShieldCheck, RotateCcw, CreditCard, type LucideIcon } from 'lucide-react';

export interface TrustItem {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
}

const DEFAULT_ITEMS: TrustItem[] = [
  { icon: ShieldCheck, titleKey: 'zero_custody_title', descKey: 'zero_custody_desc' },
  { icon: RotateCcw,   titleKey: 'refund_title',       descKey: 'refund_desc' },
  { icon: CreditCard,  titleKey: 'no_cc_title',        descKey: 'no_cc_desc' },
];

export function TrustStrip({
  namespace = 'shared.trust',
  items = DEFAULT_ITEMS,
  className = '',
}: {
  namespace?: string;
  items?: TrustItem[];
  className?: string;
}) {
  const t = useTranslations(namespace);
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${className}`}>
      {items.map(({ icon: Icon, titleKey, descKey }) => (
        <div
          key={titleKey}
          className="flex items-start gap-3 rounded-lg border border-border/40 bg-card/40 px-4 py-3"
        >
          <span className="inline-flex w-9 h-9 rounded-md bg-emerald-500/10 ring-1 ring-emerald-500/20 items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-emerald-400" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-medium text-foreground mb-0.5">{t(titleKey)}</p>
            <p className="text-xs text-foreground/55 leading-snug">{t(descKey)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
