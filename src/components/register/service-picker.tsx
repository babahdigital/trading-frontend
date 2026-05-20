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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
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

            {/* HEAD — icon + title + blurb (fixed height) */}
            <div className="flex items-start gap-4 mb-5">
              <div className="shrink-0 w-11 h-11 rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20 flex items-center justify-center text-amber-400">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-base sm:text-lg font-semibold leading-tight mb-1.5">
                  {t(svc.titleKey)}
                </h3>
                <p className="text-xs text-foreground/60 leading-relaxed line-clamp-3 min-h-[3rem]">
                  {t(svc.blurbKey)}
                </p>
              </div>
            </div>

            {/* PRICE BLOCK — always present untuk konsistensi tinggi.
                Kalau pkg null → tampilkan placeholder "—" supaya border-bottom
                tetap aligned dengan cards lain di row. */}
            <div className="mb-5 pb-5 border-b border-border/60 min-h-[3.5rem]">
              {pkg ? (
                <>
                  <div className="font-mono text-sm text-amber-400 font-semibold">{pkg.price}</div>
                  {pkg.subtitle && (
                    <div className="text-xs text-foreground/50 mt-1 line-clamp-2">{pkg.subtitle}</div>
                  )}
                </>
              ) : (
                <div className="font-mono text-sm text-foreground/40">—</div>
              )}
            </div>

            {/* FEATURES — 3 baris fixed slot supaya cards aligned */}
            <ul className="space-y-1.5 mb-6 flex-1">
              {features.slice(0, 3).map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground/70">
                  <Check className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed line-clamp-2">{f}</span>
                </li>
              ))}
              {features.length === 0 && (
                <li className="text-xs text-foreground/40 italic">
                  {t(svc.blurbKey)}
                </li>
              )}
            </ul>

            {/* CTA — push ke bottom via mt-auto */}
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
