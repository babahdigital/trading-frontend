'use client';

/**
 * Service picker — 4 cards (Signal / Crypto / VPS / Institutional).
 *
 * Demo (free) sengaja **dipisah** ke banner di atas grid supaya 4 card
 * berbayar tampil simetris. Card pricing derived dari `lib/pricing-format`
 * (single source of truth) — NOT dari CMS, supaya angka selalu konsisten
 * dengan code-side PRICE_TABLE saat ada kalibrasi.
 *
 * Features list dari i18n `register.fallback_packages.*_feature_N`.
 */
import { useTranslations } from 'next-intl';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { Check } from 'lucide-react';
import type { ServiceDescriptor, ServiceSlug } from '@/lib/register/service-registry';
import {
  getServicePriceRange,
  getServiceStartingFrom,
  getServiceFeatureKeys,
  getServiceNoteKey,
} from '@/lib/register/service-display';
import type { Locale } from '@/lib/pricing-format';

interface ServicePickerProps {
  services: ServiceDescriptor[];
  iconMap: Record<string, ComponentType<LucideProps>>;
  locale: Locale;
  onPick: (slug: ServiceSlug) => void;
}

export function ServicePicker({ services, iconMap, locale, onPick }: ServicePickerProps) {
  const t = useTranslations('register');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
      {services.map((svc) => {
        const Icon = iconMap[svc.iconKey] ?? iconMap.Sparkles;
        const priceRange = getServicePriceRange(svc.slug, locale);
        const startingFrom = getServiceStartingFrom(svc.slug, locale);
        const featureKeys = getServiceFeatureKeys(svc.slug);
        const noteKey = getServiceNoteKey(svc.slug);

        return (
          <button
            key={svc.slug}
            type="button"
            onClick={() => onPick(svc.slug)}
            aria-label={t(svc.titleKey)}
            className={`group relative text-left rounded-xl border bg-card p-6 sm:p-7 flex flex-col h-full transition-all hover:border-amber-400/60 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              svc.popular
                ? 'border-amber-400/40 ring-1 ring-amber-400/15'
                : 'border-border/60'
            }`}
          >
            {svc.popular && (
              <span className="absolute -top-2 right-4 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500 text-amber-50 text-[10px] font-bold uppercase tracking-wider">
                {t('popular_badge')}
              </span>
            )}

            {/* HEAD — icon + title (fixed slot) */}
            <div className="mb-4">
              <div className="w-11 h-11 rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-display text-base sm:text-lg font-semibold leading-tight mb-1.5">
                {t(svc.titleKey)}
              </h3>
              <p className="text-xs text-foreground/60 leading-relaxed line-clamp-3 min-h-[3rem]">
                {t(svc.blurbKey)}
              </p>
            </div>

            {/* PRICE BLOCK — derived dari PRICE_TABLE, locale-aware */}
            <div className="mb-4 pb-4 border-b border-border/60 min-h-[4rem]">
              {startingFrom ? (
                <>
                  <div className="text-[10px] uppercase tracking-wider text-foreground/40 font-medium mb-1">
                    {t('starts_from')}
                  </div>
                  <div className="font-mono text-base text-amber-400 font-semibold leading-tight">
                    {startingFrom}
                  </div>
                  <div className="text-[10px] text-foreground/50 mt-1 leading-snug line-clamp-2">
                    {priceRange}
                  </div>
                </>
              ) : (
                <div className="font-mono text-sm text-foreground/40">—</div>
              )}
            </div>

            {/* FEATURES — 4 slot fixed dari i18n */}
            <ul className="space-y-1.5 mb-4 flex-1">
              {featureKeys.slice(0, 4).map((key, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground/70">
                  <Check className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed line-clamp-2">{t(key)}</span>
                </li>
              ))}
            </ul>

            {/* NOTE (optional, italic small) */}
            {noteKey && (
              <p className="text-[10px] text-foreground/40 italic leading-snug mb-3 min-h-[2rem]">
                {t(noteKey)}
              </p>
            )}

            {/* CTA — push ke bottom */}
            <div className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-amber-400 group-hover:text-amber-300 transition-colors">
              {t(svc.ctaKey)}
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
