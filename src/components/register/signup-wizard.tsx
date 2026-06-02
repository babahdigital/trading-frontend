'use client';

/**
 * Reusable 3-step signup wizard (account → tier → confirm).
 *
 * Service-agnostic — service descriptor mendrive tier list, submit
 * endpoint, dan extra payload. Sebelumnya duplicate antara
 * register/signal/page.tsx (324 lines) + register/crypto/page.tsx
 * (346 lines) — sekarang single source.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ServiceDescriptor } from '@/lib/register/service-registry';
import { track } from '@/lib/analytics/track';

function getPasswordStrength(pw: string): { score: number; labelKey: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  // Return an i18n key (resolved in the component) instead of a hardcoded
  // Indonesian label so the strength meter localizes. (P2-DI-19)
  if (score <= 1) return { score, labelKey: 'strength_weak', color: 'bg-rose-500' };
  if (score <= 2) return { score, labelKey: 'strength_fair', color: 'bg-amber-500' };
  if (score <= 3) return { score, labelKey: 'strength_good', color: 'bg-emerald-500' };
  return { score, labelKey: 'strength_strong', color: 'bg-emerald-600' };
}

interface SignupWizardProps {
  service: ServiceDescriptor;
  initialTier?: string;
  isDemoMode?: boolean;
  locale: 'id' | 'en';
}

export function SignupWizard({ service, initialTier, isDemoMode = false, locale }: SignupWizardProps) {
  const t = useTranslations('register');
  const tErr = useTranslations('errors');
  const router = useRouter();

  // Simplified flow 2026-05-21 (Pak Abdullah directive): tier selection
  // di-defer ke portal pasca-register. Wizard hanya account → confirm.
  // Deep-link tier (?tier=swing) tetap di-forward sebagai metadata ke backend
  // dan dipakai sebagai post-register redirect destination ke /checkout.
  const STEPS = [t('step_account_info'), t('step_confirmation')];
  const confirmStepIndex = 1;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    demoAcknowledged: false,
  });

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

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
      // Forward deep-link tier (dari URL ?tier=…) sebagai metadata supaya
      // backend tetap bisa pre-create subscription sesuai pilihan customer.
      if (initialTier) {
        basePayload.tier = initialTier;
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
        // Track conversion event sebelum redirect — sessionStorage masih
        // available di same-tab next page load tapi sendBeacon flush
        // sebelum navigate keluar.
        track('register_complete', {
          metadata: {
            service: service.slug,
            tier: initialTier || '(none)',
            is_demo: isDemoMode ? 'true' : 'false',
          },
        });
        // Success redirect priority:
        //   1) Backend-specified data.redirectTo (custom flow override)
        //   2) Deep-link tier present + paid service → langsung ke checkout
        //   3) Default → /portal (ShopProductsSection siap untuk pick tier)
        let redirectTo: string = data.redirectTo;
        if (!redirectTo) {
          if (initialTier && !isDemoMode && service.slug !== 'free'
              && !['DEMO', 'FREE'].includes(initialTier.toUpperCase())) {
            // $0 demo/free tiers must NOT route to the paid checkout. (P2-BUG-2)
            const tierToken = `${service.slug.toUpperCase()}_${initialTier.toUpperCase()}`;
            redirectTo = `/checkout?tier=${tierToken}&provider=xendit`;
          } else {
            redirectTo = '/portal';
          }
        }
        router.push(redirectTo);
      } else {
        // Prefer a localized message for a stable backend error code, then fall
        // back to backend strings / field errors. (P2-DI-20)
        const code = typeof data.code === 'string' ? data.code : null;
        let coded = '';
        if (code) {
          try { coded = tErr(`register.${code}`); } catch { coded = ''; }
        }
        const fieldErrs = data.fieldErrors && typeof data.fieldErrors === 'object'
          ? Object.values(data.fieldErrors as Record<string, string>).filter(Boolean).join(' ')
          : '';
        setError(
          coded
            || data.error?.message
            || (typeof data.error === 'string' ? data.error : '')
            || data.message
            || fieldErrs
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
      <p className="t-eyebrow eyebrow-rule mb-4">{t(service.wizard.eyebrowKey)}</p>
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
                <label htmlFor="signup-name" className="text-sm font-medium mb-1 block">{t('field_full_name')}</label>
                <Input
                  id="signup-name"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder={t('placeholder_name_generic')}
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="signup-email" className="text-sm font-medium mb-1 block">{t('field_email')}</label>
                <Input
                  id="signup-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder={t('placeholder_email_generic')}
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="signup-password" className="text-sm font-medium mb-1 block">{t('field_password')}</label>
                <Input
                  id="signup-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder={t('placeholder_password_short')}
                  autoComplete="new-password"
                />
                {form.password.length > 0 && (() => {
                  const strength = getPasswordStrength(form.password);
                  return (
                    <div className="mt-2 space-y-1">
                      <div className="flex h-1.5 rounded-full bg-muted overflow-hidden">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`flex-1 ${i > 0 ? 'ml-0.5' : ''} rounded-full transition-colors ${
                              i < strength.score ? strength.color : 'bg-transparent'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-[11px] text-foreground/50">{t(strength.labelKey)}</p>
                    </div>
                  );
                })()}
              </div>
              <button
                type="button"
                className="btn-primary w-full h-11 rounded-md text-sm font-medium"
                onClick={() => setStep(confirmStepIndex)}
                disabled={!form.name || !form.email || !form.password || form.password.length < 8}
              >
                {t('btn_continue')}
              </button>
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
                {initialTier && !isDemoMode && service.slug !== 'free' && (
                  <div className="flex justify-between">
                    <span className="text-foreground/60">{t('field_plan')}</span>
                    <span className="font-semibold text-amber-400">{planLabel(initialTier)}</span>
                  </div>
                )}
                {(isDemoMode || service.slug === 'free') && (
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
                  onClick={() => setStep(0)}
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
