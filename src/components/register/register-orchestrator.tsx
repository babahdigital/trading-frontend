'use client';

/**
 * Universal `/register` orchestrator.
 *
 * Routes by `?service=` query param to one of three sub-flows:
 *   - `signup_wizard`: 3-step (account → tier → confirm) — signal, crypto, free
 *   - `lead_form`: VPS contact form — vps
 *   - `booking`: Cal.com embed — institutional
 *
 * No service param → service picker (cards). Deep links preserved via
 * `?service=signal&tier=scalping` semantics.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { TrendingUp, Bitcoin, Server, Sparkles, Gift, ArrowLeft } from 'lucide-react';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import {
  SERVICES,
  SERVICES_BY_SLUG,
  resolveTierFromAlias,
  type ServiceSlug,
  type ServiceDescriptor,
} from '@/lib/register/service-registry';
import { SignupWizard } from './signup-wizard';
import { LeadForm } from './lead-form';
import { InstitutionalBooking } from './institutional-booking';
import { ServicePicker } from './service-picker';

const ICONS = { TrendingUp, Bitcoin, Server, Sparkles, Gift } as const;

export interface OrchestratorPackage {
  slug: string;
  name: string;
  price: string;
  subtitle: string | null;
  features: unknown;
  note: string | null;
  ctaLabel: string;
  ctaLink: string;
}

export function RegisterOrchestrator({ packages }: { packages: OrchestratorPackage[] }) {
  const t = useTranslations('register');
  const router = useRouter();
  const search = useSearchParams();
  const routeParams = useParams<{ locale?: string }>();
  const locale: 'id' | 'en' = routeParams?.locale === 'en' ? 'en' : 'id';

  // Resolve service from URL. Empty / invalid → render picker.
  const serviceParam = search.get('service')?.toLowerCase() as ServiceSlug | null;
  const tierParam = search.get('tier');
  const modeParam = search.get('mode');
  const service: ServiceDescriptor | null = serviceParam ? SERVICES_BY_SLUG.get(serviceParam) ?? null : null;

  // Demo mode override: ?mode=demo treats as free signup regardless of service param
  const isDemoMode = modeParam === 'demo';
  const effectiveService = isDemoMode ? SERVICES_BY_SLUG.get('free')! : service;

  const [transitioning, setTransitioning] = useState(false);

  // When user picks a card, navigate via shallow push so back button works.
  const pickService = useCallback(
    (slug: ServiceSlug) => {
      setTransitioning(true);
      const params = new URLSearchParams(search.toString());
      params.set('service', slug);
      // Strip stale tier/mode when switching service
      params.delete('tier');
      params.delete('mode');
      router.push(`?${params.toString()}`, { scroll: true });
      // Defensive: clear transition flag setelah next-router push complete via small timeout
      setTimeout(() => setTransitioning(false), 250);
    },
    [router, search],
  );

  const backToPicker = useCallback(() => {
    setTransitioning(true);
    router.push('/register', { scroll: true });
    setTimeout(() => setTransitioning(false), 250);
  }, [router]);

  // Pre-compute initial tier (deep-link support)
  const initialTier = useMemo(() => {
    if (!effectiveService?.tiers) return undefined;
    return resolveTierFromAlias(effectiveService, tierParam);
  }, [effectiveService, tierParam]);

  // Scroll to top when service changes (after picker → flow)
  useEffect(() => {
    if (effectiveService) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [effectiveService?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!effectiveService) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <EnterpriseNav />
        <main id="main-content">
          <section className="section-padding border-b border-border/60">
            <div className="container-default px-4 sm:px-6">
              <div className="max-w-5xl mx-auto">
                <p className="t-eyebrow mb-4">{t('hero_eyebrow')}</p>
                <h1 className="t-display-page mb-3">{t('title')}</h1>
                <p className="t-lead text-foreground/60 max-w-2xl mb-10">{t('subtitle')}</p>
                <ServicePicker
                  services={SERVICES}
                  iconMap={ICONS}
                  packages={packages}
                  locale={locale}
                  onPick={pickService}
                />
                <p className="mt-10 text-xs text-foreground/50 text-center">
                  {t('have_account')}{' '}
                  <a href={`/${locale === 'en' ? 'en/' : ''}login`} className="text-amber-400 hover:underline">
                    {t('sign_in_link')}
                  </a>
                </p>
              </div>
            </div>
          </section>
        </main>
        <EnterpriseFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="max-w-md mx-auto">
              {/* Breadcrumb-style back link to picker */}
              <button
                type="button"
                onClick={backToPicker}
                className="inline-flex items-center gap-1.5 text-xs text-foreground/50 hover:text-amber-400 transition-colors mb-6"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t('btn_back')}
              </button>

              {transitioning ? (
                <div className="card-enterprise text-center py-12">
                  <div className="text-foreground/50 text-sm">{t('btn_processing')}</div>
                </div>
              ) : effectiveService.flow === 'signup_wizard' ? (
                <SignupWizard
                  service={effectiveService}
                  initialTier={initialTier}
                  isDemoMode={isDemoMode || effectiveService.slug === 'free'}
                  locale={locale}
                />
              ) : effectiveService.flow === 'lead_form' ? (
                <LeadForm service={effectiveService} locale={locale} />
              ) : (
                <InstitutionalBooking service={effectiveService} locale={locale} />
              )}
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
