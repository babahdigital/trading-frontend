'use client';

/**
 * Service picker — 5 cards (Signal / Crypto / VPS / Institutional / Free).
 *
 * Renders price preview dari CMS-driven `packages` kalau slug match, atau
 * fallback ke i18n key. Single click navigates ke `?service={slug}`.
 */
import { useTranslations } from 'next-intl';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { Check } from 'lucide-react';
import type { ServiceDescriptor, ServiceSlug } from '@/lib/register/service-registry';
import type { OrchestratorPackage } from './register-orchestrator';

interface ServicePickerProps {
  services: ServiceDescriptor[];
  iconMap: Record<string, ComponentType<LucideProps>>;
  packages: OrchestratorPackage[];
  locale: 'id' | 'en';
  onPick: (slug: ServiceSlug) => void;
}

function findPackage(packages: OrchestratorPackage[], slug: string): OrchestratorPackage | undefined {
  const norm = slug.toLowerCase();
  return packages.find((p) => p.slug.toLowerCase() === norm || p.slug.toLowerCase().includes(norm));
}

export function ServicePicker({ services, iconMap, packages, onPick }: ServicePickerProps) {
  const t = useTranslations('register');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {services.map((svc) => {
        const Icon = iconMap[svc.iconKey] ?? iconMap.Sparkles;
        const pkg = findPackage(packages, svc.slug);
        const features = Array.isArray(pkg?.features) ? (pkg!.features as string[]) : [];
        return (
          <button
            key={svc.slug}
            type="button"
            onClick={() => onPick(svc.slug)}
            aria-label={t(svc.titleKey)}
            className={`relative text-left rounded-xl border bg-card p-6 sm:p-7 transition-all hover:border-amber-400/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
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
            <div className="flex items-start gap-4 mb-4">
              <div className="shrink-0 w-11 h-11 rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20 flex items-center justify-center text-amber-400">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-base sm:text-lg font-semibold leading-tight">
                  {t(svc.titleKey)}
                </h3>
                <p className="text-xs text-foreground/60 mt-1">{t(svc.blurbKey)}</p>
              </div>
            </div>

            {pkg && (
              <div className="mb-4 pb-4 border-b border-border/60">
                <div className="font-mono text-sm text-amber-400 font-semibold">{pkg.price}</div>
                {pkg.subtitle && (
                  <div className="text-xs text-foreground/50 mt-1">{pkg.subtitle}</div>
                )}
              </div>
            )}

            {features.slice(0, 3).length > 0 && (
              <ul className="space-y-1.5 mb-4">
                {features.slice(0, 3).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground/70">
                    <Check className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 group-hover:text-amber-300">
              {t(svc.ctaKey)} →
            </div>
          </button>
        );
      })}
    </div>
  );
}
