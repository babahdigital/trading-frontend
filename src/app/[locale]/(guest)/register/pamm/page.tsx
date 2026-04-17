'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STEPS = ['Account Information', 'Broker Details', 'Confirmation'];

export default function RegisterPammPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', broker: '', mt5Account: '', tier: 'PAMM_BASIC' });

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
        body: JSON.stringify({
          name: form.name, email: form.email, password: form.password,
          tier: form.tier, brokerName: form.broker, mt5Account: form.mt5Account,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setError('');
        alert(data.message || 'Registration successful! Your account will be activated by admin.');
        router.push('/login');
      } else {
        setError(typeof data.error === 'string' ? data.error : 'Registration failed. Please try again.');
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

      <div className="max-w-lg mx-auto px-6 py-20">
        <h1 className="font-display text-display-sm text-foreground mb-2">PAMM Account Registration</h1>
        <p className="text-muted-foreground mb-10">Professional managed account with profit sharing.</p>

        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i <= step ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                {i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i <= step ? 'text-foreground' : 'text-muted-foreground'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle>{STEPS[step]}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            {step === 0 && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">Full Name</label>
                  <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="John Doe" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Email</label>
                  <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="john@example.com" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Password</label>
                  <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Min 8 characters" />
                </div>
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setStep(1)} disabled={!form.name || !form.email || !form.password}>
                  Continue
                </Button>
              </>
            )}

            {step === 1 && (
              <>
                <div className="space-y-3 mb-4">
                  {[
                    { value: 'PAMM_BASIC', label: 'PAMM Basic', share: '20% profit share', desc: 'Minimum deposit $500' },
                    { value: 'PAMM_PRO', label: 'PAMM Pro', share: '30% profit share', desc: 'Minimum deposit $5,000, priority support' },
                  ].map((tier) => (
                    <div
                      key={tier.value}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${form.tier === tier.value ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}`}
                      onClick={() => set('tier', tier.value)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{tier.label}</span>
                        <span className="text-accent font-mono font-bold">{tier.share}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{tier.desc}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Broker Name</label>
                  <Input value={form.broker} onChange={(e) => set('broker', e.target.value)} placeholder="e.g. ICMarkets, Exness" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">MT5 Account Number</label>
                  <Input value={form.mt5Account} onChange={(e) => set('mt5Account', e.target.value)} placeholder="12345678" />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(0)}>Back</Button>
                  <Button className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setStep(2)} disabled={!form.broker || !form.mt5Account}>Continue</Button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="border border-border rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span>{form.name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{form.email}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-semibold text-accent">{form.tier === 'PAMM_BASIC' ? 'PAMM Basic (20%)' : 'PAMM Pro (30%)'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Broker</span><span>{form.broker}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">MT5 Account</span><span className="font-mono">{form.mt5Account}</span></div>
                </div>
                {error && <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-md">{error}</div>}
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                  <Button className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Processing...' : 'Confirm Registration'}
                  </Button>
                </div>
              </>
            )}
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-8">
          Trading involves significant risk of loss. Past performance does not guarantee future results.
        </p>
      </div>

      <EnterpriseFooter />
    </div>
  );
}
