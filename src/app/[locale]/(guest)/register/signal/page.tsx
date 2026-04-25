'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const STEPS = ['Account Information', 'Select Tier', 'Confirmation'];

export default function RegisterSignalPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', tier: 'SIGNAL_BASIC' });

  function set(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, tier: form.tier }),
      });
      const data = await res.json();
      if (res.ok) {
        setError('');
        setStep(2);
        alert(data.message || 'Registration successful! Your account will be activated by admin.');
        router.push('/login');
      } else {
        setError(data.error || 'Registration failed. Please try again.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />

      <main id="main-content">
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-6">
            <div className="max-w-md mx-auto">
              <p className="t-eyebrow mb-4">Register</p>
              <h1 className="t-display-sub mb-2">Signal Service Registration</h1>
              <p className="t-lead text-foreground/60 mb-10">
                AI-powered trading signals delivered to your dashboard.
              </p>

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
                        <label className="text-sm font-medium mb-1 block">Full Name</label>
                        <Input
                          value={form.name}
                          onChange={(e) => set('name', e.target.value)}
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Email</label>
                        <Input
                          type="email"
                          value={form.email}
                          onChange={(e) => set('email', e.target.value)}
                          placeholder="john@example.com"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Password</label>
                        <Input
                          type="password"
                          value={form.password}
                          onChange={(e) => set('password', e.target.value)}
                          placeholder="Min 8 characters"
                        />
                      </div>
                      <button
                        className="btn-primary w-full"
                        onClick={() => setStep(1)}
                        disabled={!form.name || !form.email || !form.password}
                      >
                        Continue
                      </button>
                    </>
                  )}

                  {step === 1 && (
                    <>
                      <div className="space-y-3">
                        {[
                          {
                            value: 'SIGNAL_BASIC',
                            label: 'Signal Basic',
                            price: '$49/month',
                            desc: 'AI-powered signals, dashboard access, daily reports',
                          },
                          {
                            value: 'SIGNAL_VIP',
                            label: 'Signal VIP',
                            price: '$149/month',
                            desc: 'All Basic features + real-time Telegram alerts + priority support',
                          },
                        ].map((tier) => (
                          <div
                            key={tier.value}
                            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                              form.tier === tier.value
                                ? 'border-amber-400 bg-amber-400/5'
                                : 'border-border/60 hover:border-amber-400/50'
                            }`}
                            onClick={() => set('tier', tier.value)}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-semibold">{tier.label}</span>
                              <span className="text-amber-400 font-mono font-bold">{tier.price}</span>
                            </div>
                            <p className="t-body-sm text-foreground/60 mt-1">{tier.desc}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          className="flex-1 border-border/60 text-foreground/50 hover:text-amber-400"
                          onClick={() => setStep(0)}
                        >
                          Back
                        </Button>
                        <button className="btn-primary flex-1" onClick={() => setStep(2)}>
                          Continue
                        </button>
                      </div>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <div className="border border-border/60 rounded-lg p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-foreground/60">Name</span>
                          <span>{form.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground/60">Email</span>
                          <span>{form.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground/60">Plan</span>
                          <span className="font-semibold text-amber-400">
                            {form.tier === 'SIGNAL_BASIC' ? 'Signal Basic ($49/mo)' : 'Signal VIP ($149/mo)'}
                          </span>
                        </div>
                      </div>
                      {error && (
                        <div className="t-body-sm text-red-400 bg-red-500/10 p-3 rounded-md">{error}</div>
                      )}
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          className="flex-1 border-border/60 text-foreground/50 hover:text-amber-400"
                          onClick={() => setStep(1)}
                        >
                          Back
                        </Button>
                        <button
                          className="btn-primary flex-1"
                          onClick={handleSubmit}
                          disabled={loading}
                        >
                          {loading ? 'Processing...' : 'Confirm Registration'}
                        </button>
                      </div>
                    </>
                  )}
                </form>
              </div>

              <p className="text-xs text-foreground/50 text-center mt-6">
                We recommend{' '}
                <a href="#" className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors">
                  Exness
                </a>{' '}
                as your broker for optimal signal execution.
              </p>
              <p className="t-body-sm text-foreground/60 text-center mt-4">
                Trading involves significant risk of loss. Past performance does not guarantee future results.
              </p>
            </div>
          </div>
        </section>
      </main>

      <EnterpriseFooter />
    </div>
  );
}
