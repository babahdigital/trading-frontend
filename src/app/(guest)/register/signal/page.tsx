'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STEPS = ['Informasi Akun', 'Pilih Tier', 'Konfirmasi'];

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
        alert(data.message || 'Registrasi berhasil! Akun Anda akan diaktivasi oleh admin.');
        router.push('/login');
      } else {
        setError(data.error || 'Registrasi gagal. Silakan coba lagi.');
      }
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-primary">BabahAlgo</Link>
          <Link href="/register" className="text-sm text-muted-foreground hover:text-foreground">Kembali</Link>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-16">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i <= step ? 'text-foreground' : 'text-muted-foreground'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">Nama Lengkap</label>
                  <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="John Doe" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Email</label>
                  <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="john@example.com" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Password</label>
                  <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Min 8 karakter" />
                </div>
                <Button className="w-full" onClick={() => setStep(1)} disabled={!form.name || !form.email || !form.password}>
                  Lanjut
                </Button>
              </>
            )}

            {step === 1 && (
              <>
                <div className="space-y-3">
                  {[
                    { value: 'SIGNAL_BASIC', label: 'Signal Basic', price: '$49/bulan', desc: 'Sinyal harian, dashboard monitoring' },
                    { value: 'SIGNAL_VIP', label: 'Signal VIP', price: '$149/bulan', desc: 'Semua fitur Basic + priority alerts + laporan detail' },
                  ].map((tier) => (
                    <div
                      key={tier.value}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${form.tier === tier.value ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                      onClick={() => set('tier', tier.value)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{tier.label}</span>
                        <span className="text-primary font-bold">{tier.price}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{tier.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(0)}>Kembali</Button>
                  <Button className="flex-1" onClick={() => setStep(2)}>Lanjut</Button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Nama</span><span>{form.name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{form.email}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Paket</span><span className="font-semibold text-primary">{form.tier === 'SIGNAL_BASIC' ? 'Signal Basic ($49/bln)' : 'Signal VIP ($149/bln)'}</span></div>
                </div>
                {error && <div className="text-sm text-yellow-400 bg-yellow-500/10 p-3 rounded-md">{error}</div>}
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Kembali</Button>
                  <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Memproses...' : 'Konfirmasi Pendaftaran'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
