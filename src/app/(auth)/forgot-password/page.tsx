'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthLocaleSwitcher } from '@/components/ui/auth-locale-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Link from 'next/link';
import { BrandLogo } from '@/components/layout/brand-logo';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const tErr = useTranslations('errors');

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        credentials: 'same-origin',
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const code = typeof data.code === 'string' ? data.code : null;
        let message: string | null = null;
        if (code) {
          try {
            message = tErr(`auth.${code}`);
          } catch {
            message = null;
          }
        }
        setError(message || data.error || t('login_failed'));
        return;
      }

      setSubmitted(true);
    } catch {
      setError(t('network_error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-5">
      {/* Left — Form (60%) */}
      <div className="col-span-3 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 relative">
        {/* Theme + locale switchers */}
        <div className="absolute top-6 right-6 sm:top-8 sm:right-8 flex items-center gap-2">
          <ThemeToggle />
          <AuthLocaleSwitcher />
        </div>

        <div className="w-full max-w-md mx-auto lg:mx-0">
          {/* Logo — preserved aspect ratio via BrandLogo (PNG asal ~4:1) */}
          <div className="mb-12">
            <BrandLogo height={28} priority />
          </div>

          {!submitted ? (
            <>
              <h1 className="t-display-sub mb-2">{t('forgot_title')}</h1>
              <p className="t-body text-foreground/60 mb-10">{t('forgot_subtitle')}</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="t-eyebrow mb-2 block" htmlFor="forgot-email">
                    {t('forgot_email_label')}
                  </label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder={t('forgot_email_placeholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="font-mono"
                    required
                    autoComplete="email"
                  />
                </div>

                {error && (
                  <div
                    className="text-sm text-red-400 bg-red-400/10 p-3 rounded-md"
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="btn-primary w-full h-12 text-sm font-medium"
                  disabled={loading}
                >
                  {loading ? t('forgot_submitting') : t('forgot_submit')}
                </Button>

                <div className="text-sm">
                  <Link
                    href="/login"
                    className="text-foreground/50 hover:text-amber-400 transition-colors"
                  >
                    {t('forgot_back_to_login')}
                  </Link>
                </div>
              </form>
            </>
          ) : (
            <div>
              <h1 className="t-display-sub mb-3">{t('forgot_success_title')}</h1>
              <p className="t-body text-foreground/70 mb-8">{t('forgot_success_body')}</p>
              <Link
                href="/login"
                className="btn-primary inline-flex items-center justify-center h-12 px-6 text-sm font-medium rounded-md"
              >
                {t('forgot_back_to_login')}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Right — Editorial panel (40%) */}
      <div
        className="hidden lg:flex col-span-2 flex-col justify-center items-center px-12 relative"
        style={{ background: 'var(--brand-midnight)' }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative max-w-sm text-center">
          <div className="w-12 h-px bg-amber-500/40 mx-auto mb-8" />
          <blockquote className="font-display text-[28px] leading-snug italic text-foreground/80 mb-8">
            &ldquo;{t('tagline_quote')}&rdquo;
          </blockquote>
          <p className="t-body-sm text-foreground/40 tracking-wide">{t('tagline_attribution')}</p>
          <div className="w-12 h-px bg-amber-500/40 mx-auto mt-8" />
        </div>
      </div>
    </div>
  );
}
