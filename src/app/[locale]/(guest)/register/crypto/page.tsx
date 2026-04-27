'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Tier {
  value: 'CRYPTO_BASIC' | 'CRYPTO_PRO' | 'CRYPTO_HNWI';
  labelKey: 'tier_basic_label' | 'tier_pro_label' | 'tier_hnwi_label';
  price: string;
  profitKey: 'tier_basic_profit' | 'tier_pro_profit' | 'tier_hnwi_profit';
  descKey: 'tier_basic_desc' | 'tier_pro_desc' | 'tier_hnwi_desc';
  highlight?: boolean;
}

const TIERS: Tier[] = [
  {
    value: 'CRYPTO_BASIC',
    labelKey: 'tier_basic_label',
    price: '$49/mo',
    profitKey: 'tier_basic_profit',
    descKey: 'tier_basic_desc',
  },
  {
    value: 'CRYPTO_PRO',
    labelKey: 'tier_pro_label',
    price: '$199/mo',
    profitKey: 'tier_pro_profit',
    descKey: 'tier_pro_desc',
    highlight: true,
  },
  {
    value: 'CRYPTO_HNWI',
    labelKey: 'tier_hnwi_label',
    price: '$499/mo',
    profitKey: 'tier_hnwi_profit',
    descKey: 'tier_hnwi_desc',
  },
];

function CryptoRegisterInner() {
  const t = useTranslations('register');
  const tCrypto = useTranslations('register.crypto');
  const router = useRouter();
  const searchParams = useSearchParams();
  const tierFromUrl = searchParams.get('tier');

  const initialTier: Tier['value'] =
    tierFromUrl === 'pro' ? 'CRYPTO_PRO' :
    tierFromUrl === 'hnwi' ? 'CRYPTO_HNWI' :
    'CRYPTO_BASIC';

  const STEPS = [t('step_account'), t('step_select_tier'), t('step_confirmation')];

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    tier: initialTier as Tier['value'],
    agreeRisk: false,
  });

  useEffect(() => {
    if (tierFromUrl === 'pro') setForm((f) => ({ ...f, tier: 'CRYPTO_PRO' }));
    else if (tierFromUrl === 'hnwi') setForm((f) => ({ ...f, tier: 'CRYPTO_HNWI' }));
    else if (tierFromUrl === 'basic') setForm((f) => ({ ...f, tier: 'CRYPTO_BASIC' }));
  }, [tierFromUrl]);

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
          product: 'crypto',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setError('');
        alert(data.message || t('success_register'));
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

  const selectedTier = TIERS.find((tier) => tier.value === form.tier);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />

      <main id="main-content">
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="max-w-md mx-auto">
              <p className="t-eyebrow mb-4">{tCrypto('eyebrow')}</p>
              <h1 className="t-display-sub mb-2">{tCrypto('title')}</h1>
              <p className="t-lead text-foreground/60 mb-10">{tCrypto('subtitle')}</p>

              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 mb-8">
                {STEPS.map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        i <= step ? 'bg-amber-400 text-black' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {i + 1}
                    </div>
                    <span
                      className={`text-xs hidden sm:block ${i <= step ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      {s}
                    </span>
                    {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
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
                          placeholder={t('placeholder_name_ktp')}
                          autoComplete="name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">{t('field_email')}</label>
                        <Input
                          type="email"
                          value={form.email}
                          onChange={(e) => set('email', e.target.value)}
                          placeholder={t('placeholder_email_personal')}
                          autoComplete="email"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">{t('field_password')}</label>
                        <Input
                          type="password"
                          value={form.password}
                          onChange={(e) => set('password', e.target.value)}
                          placeholder={t('placeholder_password')}
                          autoComplete="new-password"
                        />
                      </div>
                      <button
                        type="button"
                        className="btn-primary w-full h-11 rounded-md text-sm font-medium"
                        onClick={() => setStep(1)}
                        disabled={!form.name || !form.email || form.password.length < 8}
                      >
                        {t('btn_continue')}
                      </button>
                    </>
                  )}

                  {step === 1 && (
                    <>
                      <div className="space-y-3">
                        {TIERS.map((tier) => (
                          <button
                            type="button"
                            key={tier.value}
                            onClick={() => set('tier', tier.value)}
                            className={`w-full text-left border rounded-lg p-4 transition-colors relative ${
                              form.tier === tier.value
                                ? 'border-amber-400 bg-amber-400/5 ring-1 ring-amber-400/30'
                                : 'border-border hover:border-amber-400/40'
                            }`}
                          >
                            {tier.highlight && (
                              <span className="absolute -top-2 right-3 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500 text-amber-50 text-[10px] font-bold uppercase tracking-wider">
                                {t('popular_badge')}
                              </span>
                            )}
                            <div className="flex justify-between items-baseline gap-2 flex-wrap">
                              <span className="font-semibold">{tCrypto(tier.labelKey)}</span>
                              <span className="text-amber-400 font-mono font-bold text-sm">{tier.price}</span>
                            </div>
                            <p className="text-[11px] text-amber-400/80 font-mono uppercase tracking-wider mt-1">
                              {tCrypto(tier.profitKey)}
                            </p>
                            <p className="t-body-sm text-foreground/60 mt-1.5">{tCrypto(tier.descKey)}</p>
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-3 pt-2">
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
                          className="btn-primary flex-1 h-11 rounded-md text-sm font-medium"
                          onClick={() => setStep(2)}
                        >
                          {t('btn_continue')}
                        </button>
                      </div>
                    </>
                  )}

                  {step === 2 && selectedTier && (
                    <>
                      <div className="border border-border rounded-lg p-4 space-y-2 text-sm bg-muted/30">
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
                          <span className="font-semibold text-amber-400">{tCrypto(selectedTier.labelKey)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground/60">{t('field_fee')}</span>
                          <span className="font-mono">{selectedTier.price}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground/60">{t('field_profit_share')}</span>
                          <span className="font-mono">{tCrypto(selectedTier.profitKey).replace('+ ', '')}</span>
                        </div>
                      </div>

                      <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={form.agreeRisk}
                          onChange={(e) => set('agreeRisk', e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-input"
                        />
                        <span className="text-foreground/70 leading-relaxed">
                          {tCrypto('risk_acknowledgment_part1')}{' '}
                          <a href="/legal/risk-disclosure" className="text-amber-400 hover:underline">
                            {tCrypto('risk_disclosure_link')}
                          </a>{' '}
                          {tCrypto('risk_acknowledgment_and')}{' '}
                          <a href="/legal/terms" className="text-amber-400 hover:underline">
                            {tCrypto('terms_link')}
                          </a>
                          {tCrypto('risk_acknowledgment_period')}
                        </span>
                      </label>

                      {error && (
                        <div className="t-body-sm text-red-400 bg-red-500/10 border border-red-500/30 p-3 rounded-md">
                          {error}
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setStep(1)}
                        >
                          {t('btn_back')}
                        </Button>
                        <button
                          type="button"
                          className="btn-primary flex-1 h-11 rounded-md text-sm font-medium disabled:opacity-50"
                          onClick={handleSubmit}
                          disabled={loading || !form.agreeRisk}
                        >
                          {loading ? t('btn_processing') : tCrypto('btn_confirm')}
                        </button>
                      </div>
                    </>
                  )}
                </form>
              </div>

              <p className="t-body-sm text-foreground/60 text-center mt-6 leading-relaxed">
                {tCrypto('footer_note_part1')}
                <strong> {tCrypto('footer_note_warn')}</strong> {tCrypto('footer_note_part2')}
              </p>
            </div>
          </div>
        </section>
      </main>

      <EnterpriseFooter />
    </div>
  );
}

export default function RegisterCryptoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <CryptoRegisterInner />
    </Suspense>
  );
}
