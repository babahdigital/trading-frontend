'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const STEPS = ['Akun', 'Pilih Tier', 'Konfirmasi'];

interface Tier {
  value: 'CRYPTO_BASIC' | 'CRYPTO_PRO' | 'CRYPTO_HNWI';
  label: string;
  price: string;
  profitShare: string;
  desc: string;
  highlight?: string;
}

const TIERS: Tier[] = [
  {
    value: 'CRYPTO_BASIC',
    label: 'Crypto Basic',
    price: '$49/bulan',
    profitShare: '+ 20% profit share',
    desc: '3 pair · 5x leverage · scalping_momentum · email support',
  },
  {
    value: 'CRYPTO_PRO',
    label: 'Crypto Pro',
    price: '$199/bulan',
    profitShare: '+ 15% profit share',
    desc: '8 pair · 10x leverage · 4 strategi · Telegram VIP',
    highlight: 'Pilihan Populer',
  },
  {
    value: 'CRYPTO_HNWI',
    label: 'Crypto HNWI',
    price: '$499/bulan',
    profitShare: '+ 10% profit share',
    desc: '12 pair custom · 15x leverage · all strategi · dedicated manager',
  },
];

function CryptoRegisterInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tierFromUrl = searchParams.get('tier');

  const initialTier: Tier['value'] =
    tierFromUrl === 'pro' ? 'CRYPTO_PRO' :
    tierFromUrl === 'hnwi' ? 'CRYPTO_HNWI' :
    'CRYPTO_BASIC';

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
        alert(data.message || 'Pendaftaran berhasil! Cek email untuk verifikasi.');
        router.push('/login');
      } else {
        setError(data.error || 'Pendaftaran gagal. Silakan coba lagi.');
      }
    } catch {
      setError('Terjadi gangguan jaringan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  const selectedTier = TIERS.find((t) => t.value === form.tier);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />

      <main id="main-content">
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="max-w-md mx-auto">
              <p className="t-eyebrow mb-4">Registrasi · Crypto Bot</p>
              <h1 className="t-display-sub mb-2">Aktivasi Crypto Bot</h1>
              <p className="t-lead text-foreground/60 mb-10">
                Bot Binance Futures dengan strategi institusional. Anda akan diminta hubungkan API key Binance setelah verifikasi email.
              </p>

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
                        <label className="text-sm font-medium mb-1 block">Nama Lengkap</label>
                        <Input
                          value={form.name}
                          onChange={(e) => set('name', e.target.value)}
                          placeholder="Sesuai KTP"
                          autoComplete="name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Email</label>
                        <Input
                          type="email"
                          value={form.email}
                          onChange={(e) => set('email', e.target.value)}
                          placeholder="anda@email.com"
                          autoComplete="email"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Password</label>
                        <Input
                          type="password"
                          value={form.password}
                          onChange={(e) => set('password', e.target.value)}
                          placeholder="Minimal 8 karakter, kombinasi huruf+angka"
                          autoComplete="new-password"
                        />
                      </div>
                      <button
                        type="button"
                        className="btn-primary w-full h-11 rounded-md text-sm font-medium"
                        onClick={() => setStep(1)}
                        disabled={!form.name || !form.email || form.password.length < 8}
                      >
                        Lanjut
                      </button>
                    </>
                  )}

                  {step === 1 && (
                    <>
                      <div className="space-y-3">
                        {TIERS.map((t) => (
                          <button
                            type="button"
                            key={t.value}
                            onClick={() => set('tier', t.value)}
                            className={`w-full text-left border rounded-lg p-4 transition-colors relative ${
                              form.tier === t.value
                                ? 'border-amber-400 bg-amber-400/5 ring-1 ring-amber-400/30'
                                : 'border-border hover:border-amber-400/40'
                            }`}
                          >
                            {t.highlight && (
                              <span className="absolute -top-2 right-3 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500 text-amber-50 text-[10px] font-bold uppercase tracking-wider">
                                {t.highlight}
                              </span>
                            )}
                            <div className="flex justify-between items-baseline gap-2 flex-wrap">
                              <span className="font-semibold">{t.label}</span>
                              <span className="text-amber-400 font-mono font-bold text-sm">{t.price}</span>
                            </div>
                            <p className="text-[11px] text-amber-400/80 font-mono uppercase tracking-wider mt-1">
                              {t.profitShare}
                            </p>
                            <p className="t-body-sm text-foreground/60 mt-1.5">{t.desc}</p>
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
                          Kembali
                        </Button>
                        <button
                          type="button"
                          className="btn-primary flex-1 h-11 rounded-md text-sm font-medium"
                          onClick={() => setStep(2)}
                        >
                          Lanjut
                        </button>
                      </div>
                    </>
                  )}

                  {step === 2 && selectedTier && (
                    <>
                      <div className="border border-border rounded-lg p-4 space-y-2 text-sm bg-muted/30">
                        <div className="flex justify-between">
                          <span className="text-foreground/60">Nama</span>
                          <span>{form.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground/60">Email</span>
                          <span className="font-mono text-xs sm:text-sm truncate ml-2">{form.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground/60">Paket</span>
                          <span className="font-semibold text-amber-400">{selectedTier.label}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground/60">Biaya</span>
                          <span className="font-mono">{selectedTier.price}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground/60">Profit share</span>
                          <span className="font-mono">{selectedTier.profitShare.replace('+ ', '')}</span>
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
                          Saya memahami trading kripto sangat volatil, kinerja masa lalu tidak menjamin hasil masa depan,
                          dan saya menggunakan dana yang relakan untuk hilang. Saya setuju dengan{' '}
                          <a href="/legal/risk-disclosure" className="text-amber-400 hover:underline">
                            Risk Disclosure
                          </a>{' '}
                          dan{' '}
                          <a href="/legal/terms" className="text-amber-400 hover:underline">
                            Terms of Service
                          </a>.
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
                          Kembali
                        </Button>
                        <button
                          type="button"
                          className="btn-primary flex-1 h-11 rounded-md text-sm font-medium disabled:opacity-50"
                          onClick={handleSubmit}
                          disabled={loading || !form.agreeRisk}
                        >
                          {loading ? 'Memproses…' : 'Konfirmasi Daftar'}
                        </button>
                      </div>
                    </>
                  )}
                </form>
              </div>

              <p className="t-body-sm text-foreground/60 text-center mt-6 leading-relaxed">
                Setelah pendaftaran, lakukan KYC + pembayaran, lalu hubungkan Binance API key (permission: Read + Futures Trade,
                <strong> JANGAN</strong> Withdraw).
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
