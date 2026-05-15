'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ShieldCheck, ArrowRight, Sparkles, Eye } from 'lucide-react';
import { TierBadge } from '@/components/tiers/tier-badge';

/**
 * Free tier self-service signup (Phase 14V Wave 2 — Backend `POST /auth/signup`).
 *
 * Flow: 1 step form → instant tenant creation → cookie set + redirect /portal.
 * Tier auto-assigned 'free', products=['signals'], AI mode=SHADOW.
 *
 * Zero credit card. No KYC for free tier. Customer bisa upgrade ke micro/
 * starter/pro/vip nanti via /pricing → checkout flow.
 */
const COPY = {
  id: {
    eyebrow: 'Daftar Gratis · Instan',
    title: 'Mulai dari tier free — tanpa kartu kredit.',
    lead: 'Signal view + AI brain mode SHADOW (observasi tanpa eksekusi live). Akun aktif dalam 5 detik. Modal Anda tetap di akun broker — kami zero-custody.',
    field_email: 'Email',
    field_email_ph: 'anda@email.com',
    field_name: 'Nama lengkap',
    field_name_ph: 'Sesuai KTP / business name',
    submit: 'Buat akun gratis',
    submitting: 'Memproses…',
    have_account: 'Sudah punya akun?',
    sign_in: 'Masuk di sini',
    benefits_title: 'Apa yang Anda dapat (gratis selamanya):',
    benefits: [
      'Signal feed live 3 strategi inti (SMC Scalper, SMC Swing, Pivot Mean Reversion)',
      'AI Brain mode SHADOW — pantau verdict per signal tanpa eksekusi',
      'Dashboard performa + kurva equity realtime',
      'Akses Robot Meta Demo (MT5 demo account) 7 hari',
      'Upgrade ke micro/starter/pro kapan saja saat siap',
    ],
    legal_note: 'Dengan daftar, Anda setuju dengan Syarat Layanan + Pernyataan Risiko.',
    success_title: 'Akun aktif',
    success_body: 'Mengarahkan ke dashboard portal…',
    error_generic: 'Pendaftaran gagal',
    upgrade_link: 'Lihat tier berbayar',
  },
  en: {
    eyebrow: 'Free Signup · Instant',
    title: 'Start on the free tier — no credit card required.',
    lead: 'Signal view + AI Brain in SHADOW mode (observe only, no live execution). Account is active in 5 seconds. Your capital stays in your broker account — we are zero-custody.',
    field_email: 'Email',
    field_email_ph: 'you@email.com',
    field_name: 'Full name',
    field_name_ph: 'Matches ID / business name',
    submit: 'Create free account',
    submitting: 'Processing…',
    have_account: 'Already have an account?',
    sign_in: 'Sign in here',
    benefits_title: "Here's what you get (free forever):",
    benefits: [
      'Live signal feed for all 3 core strategies (SMC Scalper, SMC Swing, Pivot Mean Reversion)',
      'AI Brain in SHADOW mode — watch each signal verdict without executing',
      'Real-time dashboard + equity curve',
      'Access Robot Meta Demo (MT5 demo account) for 7 days',
      'Upgrade to micro / starter / pro anytime when ready',
    ],
    legal_note: 'By signing up, you agree to the Terms of Service and Risk Disclosure.',
    success_title: 'Account active',
    success_body: 'Redirecting to your portal dashboard…',
    error_generic: 'Signup failed',
    upgrade_link: 'See paid tiers',
  },
} as const;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function FreeSignupClient() {
  const router = useRouter();
  const locale = useLocale() as 'id' | 'en';
  const copy = COPY[locale === 'en' ? 'en' : 'id'];

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email.trim())) {
      setError(locale === 'id' ? 'Format email tidak valid' : 'Invalid email format');
      return;
    }
    if (name.trim().length < 2) {
      setError(locale === 'id' ? 'Nama minimal 2 karakter' : 'Name min 2 characters');
      return;
    }
    setStatus('submitting');
    try {
      const res = await fetch('/api/public/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          display_name: name.trim(),
          language: locale,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus('success');
        // Backend set httpOnly cookie. Redirect ke portal dashboard.
        setTimeout(() => router.replace('/portal'), 1200);
      } else {
        setStatus('error');
        setError(data.error || data.code || copy.error_generic);
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : copy.error_generic);
    }
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <EnterpriseNav />
        <main id="main-content" className="section-padding">
          <div className="container-default px-4 sm:px-6 max-w-md mx-auto text-center pt-20">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30 mb-6">
              <CheckCircle2 className="h-7 w-7 text-emerald-500 dark:text-emerald-400" strokeWidth={2} />
            </div>
            <h1 className="t-display-sub mb-3">{copy.success_title}</h1>
            <p className="text-muted-foreground">{copy.success_body}</p>
          </div>
        </main>
        <EnterpriseFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        <section className="section-padding border-b border-border/60 page-stamp-editorial">
          <div className="container-default px-4 sm:px-6">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start max-w-6xl mx-auto">
              {/* Left — Form */}
              <div className="lg:col-span-7">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                  <p className="t-eyebrow">{copy.eyebrow}</p>
                  <TierBadge tier="free" />
                </div>
                <h1 className="t-display-page mb-4 leading-tight">{copy.title}</h1>
                <p className="t-lead text-muted-foreground mb-8 max-w-xl">{copy.lead}</p>

                <Card>
                  <CardContent className="p-5 sm:p-6">
                    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                      <div>
                        <label htmlFor="signup-email" className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-2">
                          {copy.field_email}
                        </label>
                        <Input
                          id="signup-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={copy.field_email_ph}
                          autoComplete="email"
                          required
                          className="h-11"
                        />
                      </div>
                      <div>
                        <label htmlFor="signup-name" className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-2">
                          {copy.field_name}
                        </label>
                        <Input
                          id="signup-name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={copy.field_name_ph}
                          autoComplete="name"
                          required
                          className="h-11"
                        />
                      </div>
                      {error ? (
                        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
                          {error}
                        </p>
                      ) : null}
                      <Button
                        type="submit"
                        disabled={status === 'submitting'}
                        className="w-full h-12 text-sm font-semibold gap-2"
                      >
                        {status === 'submitting' ? (
                          <>
                            <span className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                            {copy.submitting}
                          </>
                        ) : (
                          <>
                            {copy.submit} <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
                          </>
                        )}
                      </Button>
                    </form>
                    <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed">
                      <ShieldCheck className="inline h-3 w-3 mr-1 -mt-0.5" strokeWidth={2} />
                      {copy.legal_note}
                    </p>
                    <div className="text-sm text-center mt-5 pt-5 border-t border-border">
                      <span className="text-muted-foreground">{copy.have_account} </span>
                      <Link href="/login" className="text-amber-600 dark:text-amber-400 hover:underline font-medium">
                        {copy.sign_in}
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right — Benefits */}
              <div className="lg:col-span-5">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Eye className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                      {copy.benefits_title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {copy.benefits.map((b, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-[hsl(var(--profit))] shrink-0 mt-0.5" strokeWidth={2.25} aria-hidden />
                          <span className="text-foreground/85 leading-relaxed">{b}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-1.5 mt-5 text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium"
                    >
                      {copy.upgrade_link} <ArrowRight className="h-3 w-3" strokeWidth={2.25} />
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
