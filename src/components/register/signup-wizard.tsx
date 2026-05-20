'use client';

/**
 * Reusable 3-step signup wizard (account → tier → confirm).
 *
 * Service-agnostic — service descriptor mendrive tier list, submit
 * endpoint, dan extra payload. Sebelumnya duplicate antara
 * register/signal/page.tsx (324 lines) + register/crypto/page.tsx
 * (346 lines) — sekarang single source.
 */
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice, type Locale } from '@/lib/pricing-format';
import type { ServiceDescriptor } from '@/lib/register/service-registry';

interface SignupWizardProps {
  service: ServiceDescriptor;
  initialTier?: string;
  isDemoMode?: boolean;
  locale: 'id' | 'en';
}

export function SignupWizard({ service, initialTier, isDemoMode = false, locale }: SignupWizardProps) {
  const t = useTranslations('register');
  const router = useRouter();
  const routeParams = useParams<{ locale?: string }>();
  const localeForPrice: Locale = routeParams?.locale === 'en' ? 'en' : 'id';

  // Pre-format tier prices per render — locale-aware
  const tierPrices = useMemo(() => {
    if (!service.tiers) return {};
    return service.tiers.reduce<Record<string, string>>((acc, tier) => {
      acc[tier.value] = formatPrice(tier.priceKey, localeForPrice, { period: 'mo', compact: false });
      return acc;
    }, {});
  }, [service.tiers, localeForPrice]);

  // Demo / free → skip tier step (auto-assigned)
  const hasTierStep = !isDemoMode && (service.tiers?.length ?? 0) > 0;
  const STEPS = hasTierStep
    ? [t('step_account_info'), t('step_select_tier'), t('step_confirmation')]
    : [t('step_account_info'), t('step_confirmation')];

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    tier: initialTier ?? service.tiers?.find((tt) => tt.popular)?.value ?? '',
    demoAcknowledged: false,
  });

  // Re-apply initial tier kalau prop berubah (deep link refresh)
  useEffect(() => {
    if (initialTier) {
      setForm((f) => ({ ...f, tier: initialTier }));
    }
  }, [initialTier]);

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  const confirmStepIndex = hasTierStep ? 2 : 1;

  async function handleSubmit() {
    if (!service.submitEndpoint) {
      setError(t('error_register_failed'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const basePayload: Record<string, string> = {
        name: form.name,
        email: form.email,
        password: form.password,
      };
      if (hasTierStep && form.tier) {
        basePayload.tier = form.tier;
      }
      if (isDemoMode) {
        basePayload.accountType = 'demo';
      }
      const payload = { ...basePayload, ...(service.extraPayload ?? {}) };

      const res = await fetch(service.submitEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        // Success — redirect ke portal kalau session ada cookie, atau login
        const redirectTo = data.redirectTo || '/login';
        router.push(redirectTo);
      } else {
        setError(
          data.error?.message
            || (typeof data.error === 'string' ? data.error : '')
            || data.message
            || t('error_register_failed'),
        );
      }
    } catch {
      setError(t('error_network'));
    } finally {
      setLoading(false);
    }
  }

  function planLabel(tierValue: string): string {
    if (isDemoMode || service.slug === 'free') return t('signal.plan_demo');
    const tier = service.tiers?.find((tt) => tt.value === tierValue);
    if (!tier) return tierValue;
    return t(tier.labelKey);
  }

  return (
    <>
      <p className="t-eyebrow mb-4">{t(service.wizard.eyebrowKey)}</p>
      <h1 className="t-display-sub mb-2">{t(service.wizard.titleKey)}</h1>
      <p className="t-lead text-foreground/60 mb-6">{t(service.wizard.subtitleKey)}</p>

      {isDemoMode && (
        <div className="rounded-lg border-2 border-amber-500/40 bg-amber-500/5 p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-200 mb-1">{t('signal.eyebrow_demo')}</p>
            <p className="text-xs text-amber-200/80 leading-relaxed">{t('signal.subtitle_demo')}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                i <= step ? 'bg-amber-400 text-black' : 'bg-border text-foreground/60'
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-xs hidden sm:block ${
                i <= step ? 'text-foreground' : 'text-foreground/60'
              }`}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-white/8" />}
          </div>
        ))}
      </div>

      <div className="card-enterprise">
        <h2 className="font-semibold text-lg mb-6">{STEPS[step]}</h2>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          {step === 0 && (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">{t('field_full_name')}</label>
                <Input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder={t('placeholder_name_generic')}
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t('field_email')}</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder={t('placeholder_email_generic')}
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t('field_password')}</label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder={t('placeholder_password_short')}
                  autoComplete="new-password"
                />
              </div>
              <button
                type="button"
                className="btn-primary w-full h-11 rounded-md text-sm font-medium"
                onClick={() => setStep(hasTierStep ? 1 : confirmStepIndex)}
                disabled={!form.name || !form.email || !form.password || form.password.length < 8}
              >
                {t('btn_continue')}
              </button>
            </>
          )}

          {step === 1 && hasTierStep && (
            <>
              <div className="space-y-3">
                {service.tiers!.map((tier) => (
                  <button
                    type="button"
                    key={tier.value}
                    className={`relative w-full text-left border rounded-lg p-4 transition-colors ${
                      form.tier === tier.value
                        ? 'border-amber-400 bg-amber-400/5 ring-1 ring-amber-400/30'
                        : 'border-border/60 hover:border-amber-400/50'
                    }`}
                    onClick={() => set('tier', tier.value)}
                  >
                    {tier.popular && (
                      <span className="absolute -top-2 right-3 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500 text-amber-50 text-[10px] font-bold uppercase tracking-wider">
                        {t('badge_popular')}
                      </span>
                    )}
                    <div className="flex justify-between items-baseline gap-2 flex-wrap">
                      <span className="font-semibold">{t(tier.labelKey)}</span>
                      <span className="text-amber-400 font-mono font-bold text-sm">{tierPrices[tier.value]}</span>
                    </div>
                    <p className="t-body-sm text-foreground/60 mt-1">{t(tier.descKey)}</p>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-border/60 text-foreground/50 hover:text-amber-400"
                  onClick={() => setStep(0)}
                >
                  {t('btn_back')}
                </Button>
                <button
                  type="button"
                  className="btn-primary flex-1"
                  onClick={() => setStep(confirmStepIndex)}
                  disabled={!form.tier}
                >
                  {t('btn_continue')}
                </button>
              </div>
            </>
          )}

          {step === confirmStepIndex && (
            <>
              <div className="border border-border/60 rounded-lg p-4 space-y-2 text-sm bg-muted/30">
                <div className="flex justify-between">
                  <span className="text-foreground/60">{t('field_name')}</span>
                  <span>{form.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/60">{t('field_email')}</span>
                  <span className="font-mono text-xs sm:text-sm truncate ml-2">{form.email}</span>
                </div>
                {hasTierStep && (
                  <div className="flex justify-between">
                    <span className="text-foreground/60">{t('field_plan')}</span>
                    <span className="font-semibold text-amber-400">{planLabel(form.tier)}</span>
                  </div>
                )}
                {(isDemoMode || service.slug === 'free') && !hasTierStep && (
                  <div className="flex justify-between">
                    <span className="text-foreground/60">{t('field_plan')}</span>
                    <span className="font-semibold text-amber-400">{t('signal.plan_demo')}</span>
                  </div>
                )}
              </div>

              {isDemoMode && (
                <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none p-3 rounded-md bg-amber-500/5 border border-amber-500/30">
                  <input
                    type="checkbox"
                    checked={form.demoAcknowledged}
                    onChange={(e) => set('demoAcknowledged', e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-input shrink-0"
                  />
                  <span className="text-amber-200/90 leading-relaxed">
                    {t('signal.subtitle_demo')}
                  </span>
                </label>
              )}

              {error && (
                <div className="t-body-sm text-red-400 bg-red-500/10 border border-red-500/30 p-3 rounded-md">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(hasTierStep ? 1 : 0)}
                >
                  {t('btn_back')}
                </Button>
                <button
                  type="button"
                  className="btn-primary flex-1 h-11 rounded-md text-sm font-medium disabled:opacity-50"
                  onClick={handleSubmit}
                  disabled={loading || (isDemoMode && !form.demoAcknowledged)}
                >
                  {loading
                    ? t('btn_processing')
                    : service.wizard.submitKey
                      ? t(service.wizard.submitKey)
                      : t('signal.btn_confirm')}
                </button>
              </div>
            </>
          )}
        </form>
      </div>

      <p className="mt-6 text-xs text-foreground/50 text-center">
        {t('have_account')}{' '}
        <a href={`/${locale === 'en' ? 'en/' : ''}login`} className="text-amber-400 hover:underline">
          {t('sign_in_link')}
        </a>
      </p>
    </>
  );
}
