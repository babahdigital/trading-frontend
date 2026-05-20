'use client';

/**
 * Universal `/register` orchestrator.
 *
 * Picker mode (no ?service= param):
 *   - Hero (title + subtitle)
 *   - Demo banner (gradient) — `service=free` extracted ke top
 *   - Trust strip (3 jaminan)
 *   - 4-card grid (signal, crypto, vps, institutional) — REAL pricing dari
 *     PRICE_TABLE + features dari i18n
 *   - Live stats bar (master tenant performance, self-hides kalau empty)
 *   - FAQ accordion (real data dari prisma.Faq)
 *   - Sticky compare CTA → /pricing
 *
 * Flow mode (?service=X):
 *   - signup_wizard / lead_form / booking sub-flow
 *
 * Width: gunakan token `.layout-container` (didefinisikan di globals.css)
 * supaya konsisten dengan landing/research/lainnya. Single source untuk
 * tweak global content width.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  TrendingUp, Bitcoin, Server, Sparkles, Gift, ArrowLeft, ArrowRight,
} from 'lucide-react';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { TrustStrip } from '@/components/shared/trust-strip';
import { StickyCtaBar } from '@/components/shared/sticky-cta-bar';
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
import { StatsBar } from '@/components/shared/stats-bar';
import { FaqAccordion, type FaqItem } from '@/components/shared/faq-accordion';
import { track } from '@/lib/analytics/track';

const ICONS = { TrendingUp, Bitcoin, Server, Sparkles, Gift } as const;

interface OrchestratorProps {
  faqs: FaqItem[];
}

export function RegisterOrchestrator({ faqs }: OrchestratorProps) {
  const t = useTranslations('register');
  const router = useRouter();
  const search = useSearchParams();
  const routeParams = useParams<{ locale?: string }>();
  const locale: 'id' | 'en' = routeParams?.locale === 'en' ? 'en' : 'id';

  const serviceParam = search.get('service')?.toLowerCase() as ServiceSlug | null;
  const tierParam = search.get('tier');
  const modeParam = search.get('mode');
  const service: ServiceDescriptor | null = serviceParam ? SERVICES_BY_SLUG.get(serviceParam) ?? null : null;

  const isDemoMode = modeParam === 'demo';
  const effectiveService = isDemoMode ? SERVICES_BY_SLUG.get('free')! : service;

  const [transitioning, setTransitioning] = useState(false);

  const pickService = useCallback(
    (slug: ServiceSlug) => {
      setTransitioning(true);
      track('register_start', { metadata: { service: slug } });
      const params = new URLSearchParams(search.toString());
      params.set('service', slug);
      params.delete('tier');
      params.delete('mode');
      router.push(`?${params.toString()}`, { scroll: true });
      setTimeout(() => setTransitioning(false), 250);
    },
    [router, search],
  );

  const backToPicker = useCallback(() => {
    setTransitioning(true);
    router.push('/register', { scroll: true });
    setTimeout(() => setTransitioning(false), 250);
  }, [router]);

  const initialTier = useMemo(() => {
    if (!effectiveService?.tiers) return undefined;
    return resolveTierFromAlias(effectiveService, tierParam);
  }, [effectiveService, tierParam]);

  useEffect(() => {
    if (effectiveService) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [effectiveService?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter grid services: exclude 'free' — handled via banner.
  const gridServices = useMemo(
    () => SERVICES.filter((s) => s.slug !== 'free'),
    [],
  );

  if (!effectiveService) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <EnterpriseNav />
        <main id="main-content">
          {/* Hero section — narrow text width inside standard layout container */}
          <section className="section-padding border-b border-border/60">
            <div className="layout-container">
              <div className="max-w-3xl mb-10">
                <p className="t-eyebrow mb-4">{t('hero_eyebrow')}</p>
                <h1 className="t-display-page mb-3">{t('title')}</h1>
                <p className="t-lead text-foreground/60">{t('subtitle')}</p>
              </div>

              {/* Demo banner — gradient, separate from grid */}
              <DemoBanner onPick={pickService} t={t} />

              {/* Trust strip — 3 guarantees (shared component) */}
              <TrustStrip className="mb-10" />

              {/* 4-card grid — real pricing */}
              <ServicePicker
                services={gridServices}
                iconMap={ICONS}
                locale={locale}
                onPick={pickService}
              />

              <p className="mt-8 text-xs text-foreground/50 text-center">
                {t('have_account')}{' '}
                <Link href="/login" className="text-amber-400 hover:underline">
                  {t('sign_in_link')}
                </Link>
              </p>

              {/* Live stats bar — auto-hides kalau backend empty */}
              <StatsBar />

              {/* FAQ accordion — real data */}
              <FaqAccordion
                items={faqs}
                locale={locale}
                eyebrow={t('faq_eyebrow')}
                heading={t('faq_heading')}
                subtitle={t('faq_subtitle')}
                moreLink={{ label: t('faq_more_link'), href: '/faq' }}
              />
            </div>
          </section>

          {/* Sticky compare CTA — shared component */}
          <StickyCtaBar
            message={t('sticky_compare_text')}
            ctaLabel={t('sticky_compare_cta')}
            href="/pricing"
          />
        </main>
        <EnterpriseFooter />
      </div>
    );
  }

  // FLOW MODE — sub-flow rendered di narrow column
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        <section className="section-padding border-b border-border/60">
          <div className="layout-container">
            <div className="max-w-md mx-auto">
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

// ───────────────── Demo banner — gradient hero strip ─────────────────

function DemoBanner({ onPick, t }: { onPick: (slug: ServiceSlug) => void; t: ReturnType<typeof useTranslations> }) {
  return (
    <button
      type="button"
      onClick={() => onPick('free')}
      className="group relative w-full mb-8 overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/[0.15] via-amber-500/[0.08] to-emerald-500/[0.12] hover:border-amber-400/50 hover:shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 text-left"
      aria-label={t('demo_banner_title')}
    >
      <div className="absolute inset-0 bg-grid-amber/[0.04] pointer-events-none" aria-hidden />
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5 p-6 sm:p-7">
        <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-amber-500/20 ring-1 ring-amber-400/40 flex items-center justify-center">
          <Gift className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-amber-300/80 font-semibold mb-1">
            {t('demo_banner_eyebrow')}
          </p>
          <h2 className="font-display text-lg sm:text-xl font-semibold text-foreground mb-1.5 leading-tight">
            {t('demo_banner_title')}
          </h2>
          <p className="text-sm text-foreground/70 leading-relaxed">
            {t('demo_banner_body')}
          </p>
        </div>
        <div className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-amber-500 text-amber-950 text-sm font-semibold group-hover:bg-amber-400 transition-colors">
          {t('demo_banner_cta')}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </button>
  );
}

