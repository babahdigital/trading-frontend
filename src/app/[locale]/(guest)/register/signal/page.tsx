'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle } from 'lucide-react';

interface SignalTier {
  value: 'SIGNAL_STARTER' | 'SIGNAL_PRO' | 'SIGNAL_VIP';
  labelKey: 'tier1_label' | 'tier2_label' | 'tier3_label';
  price: string;
  descKey: 'tier1_desc' | 'tier2_desc' | 'tier3_desc';
  popular?: boolean;
}

const SIGNAL_TIERS: SignalTier[] = [
  { value: 'SIGNAL_STARTER', labelKey: 'tier1_label', price: '$19/mo', descKey: 'tier1_desc' },
  { value: 'SIGNAL_PRO', labelKey: 'tier2_label', price: '$79/mo', descKey: 'tier2_desc', popular: true },
  { value: 'SIGNAL_VIP', labelKey: 'tier3_label', price: '$299/mo', descKey: 'tier3_desc' },
];

function RegisterSignalInner() {
  const t = useTranslations('register');
  const tSignal = useTranslations('register.signal');
  const tDemo = useTranslations('demo');
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemoMode = searchParams.get('mode') === 'demo';

  const STEPS = [t('step_account_info'), t('step_select_tier'), t('step_confirmation')];

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    tier: isDemoMode ? 'DEMO' : 'SIGNAL_PRO',
    demoAcknowledged: false,
  });

  useEffect(() => {
    if (isDemoMode) {
      setForm((f) => ({ ...f, tier: 'DEMO' }));
    }
  }, [isDemoMode]);

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          tier: form.tier,
          accountType: isDemoMode ? 'demo' : 'live',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setError('');
        setStep(2);
        alert(data.message || tSignal('success_register'));
        router.push('/login');
      } else {
        setError(data.error || t('error_register_failed'));
      }
    } catch {
      setError(t('error_network'));
    } finally {
      setLoading(false);
    }
  }

  function planLabel(tierValue: string): string {
    if (isDemoMode) return tSignal('plan_demo');
    if (tierValue === 'SIGNAL_STARTER') return tSignal('plan_tier1');
    if (tierValue === 'SIGNAL_PRO') return tSignal('plan_tier2');
    if (tierValue === 'SIGNAL_VIP') return tSignal('plan_tier3');
    return tierValue;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />

      <main id="main-content">
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="max-w-md mx-auto">
              <p className="t-eyebrow mb-4">{isDemoMode ? tSignal('eyebrow_demo') : tSignal('eyebrow_register')}</p>
              <h1 className="t-display-sub mb-2">
                {isDemoMode ? tSignal('title_demo') : tSignal('title_register')}
              </h1>
              <p className="t-lead text-foreground/60 mb-6">
                {isDemoMode ? tSignal('subtitle_demo') : tSignal('subtitle_register')}
              </p>

              {/* Demo isolation banner per DEMO_UX_GUIDE §3.4 */}
              {isDemoMode && (
                <div className="rounded-lg border-2 border-amber-500/40 bg-amber-500/5 p-4 mb-6 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-200 mb-1">{tDemo('warning_title')}</p>
                    <p className="text-xs text-amber-200/80 leading-relaxed">{tDemo('warning_body')}</p>
                  </div>
                </div>
              )}

              {/* Step indicator */}
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
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">{t('field_email')}</label>
                        <Input
                          type="email"
                          value={form.email}
                          onChange={(e) => set('email', e.target.value)}
                          placeholder={t('placeholder_email_generic')}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">{t('field_password')}</label>
                        <Input
                          type="password"
                          value={form.password}
                          onChange={(e) => set('password', e.target.value)}
                          placeholder={t('placeholder_password_short')}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn-primary w-full h-11 rounded-md text-sm font-medium"
                        onClick={() => setStep(isDemoMode ? 2 : 1)}
                        disabled={!form.name || !form.email || !form.password}
                      >
                        {t('btn_continue')}
                      </button>
                    </>
                  )}

                  {step === 1 && !isDemoMode && (
                    <>
                      <div className="space-y-3">
                        {SIGNAL_TIERS.map((tier) => (
                          <div
                            key={tier.value}
                            className={`relative border rounded-lg p-4 cursor-pointer transition-colors ${
                              form.tier === tier.value
                                ? 'border-amber-400 bg-amber-400/5 ring-1 ring-amber-400/30'
                                : 'border-border/60 hover:border-amber-400/50'
                            }`}
                            onClick={() => set('tier', tier.value)}
                          >
                            {tier.popular && (
                              <span className="absolute -top-2 right-3 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500 text-amber-50 text-[10px] font-bold uppercase tracking-wider">
                                {tSignal('popular')}
                              </span>
                            )}
                            <div className="flex justify-between items-baseline gap-2 flex-wrap">
                              <span className="font-semibold">{tSignal(tier.labelKey)}</span>
                              <span className="text-amber-400 font-mono font-bold text-sm">{tier.price}</span>
                            </div>
                            <p className="t-body-sm text-foreground/60 mt-1">{tSignal(tier.descKey)}</p>
                          </div>
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
                        <button className="btn-primary flex-1" onClick={() => setStep(2)}>
                          {t('btn_continue')}
                        </button>
                      </div>
                    </>
                  )}

                  {step === 2 && (
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
                        <div className="flex justify-between">
                          <span className="text-foreground/60">{t('field_plan')}</span>
                          <span className="font-semibold text-amber-400">{planLabel(form.tier)}</span>
                        </div>
                      </div>

                      {/* Demo acknowledgment per DEMO_UX_GUIDE §3.6 */}
                      {isDemoMode && (
                        <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none p-3 rounded-md bg-amber-500/5 border border-amber-500/30">
                          <input
                            type="checkbox"
                            checked={form.demoAcknowledged}
                            onChange={(e) => set('demoAcknowledged', e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-input shrink-0"
                          />
                          <span className="text-amber-200/90 leading-relaxed">
                            {tDemo('onboarding_acknowledge')}
                          </span>
                        </label>
                      )}

                      {error && (
                        <div className="t-body-sm text-red-400 bg-red-500/10 border border-red-500/30 p-3 rounded-md">{error}</div>
                      )}
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setStep(isDemoMode ? 0 : 1)}
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
                            : isDemoMode
                              ? tSignal('btn_activate_demo')
                              : tSignal('btn_confirm')}
                        </button>
                      </div>
                    </>
                  )}
                </form>
              </div>

              <p className="text-xs text-foreground/50 text-center mt-6">
                {tSignal('footer_broker_part1')}{' '}
                <a href="#" className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors">
                  Exness
                </a>{' '}
                {tSignal('footer_broker_part2')}
              </p>
              <p className="t-body-sm text-foreground/60 text-center mt-4">
                {tSignal('footer_risk')}
              </p>
            </div>
          </div>
        </section>
      </main>

      <EnterpriseFooter />
    </div>
  );
}

export default function RegisterSignalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <RegisterSignalInner />
    </Suspense>
  );
}
