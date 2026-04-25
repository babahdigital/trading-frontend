'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthLocaleSwitcher } from '@/components/ui/auth-locale-switcher';
import Image from 'next/image';

export default function LoginPage() {
  const t = useTranslations('auth');
  const tErr = useTranslations('errors');
  const router = useRouter();
  const [mode, setMode] = useState<'admin' | 'license'>('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [mt5Account, setMt5Account] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const body = mode === 'admin'
        ? { email, password }
        : { licenseKey, mt5Account, password };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t('login_failed'));
        return;
      }

      localStorage.setItem('access_token', data.accessToken);
      localStorage.setItem('refresh_token', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      document.cookie = `access_token=${data.accessToken}; path=/; max-age=${15 * 60}; SameSite=Lax`;

      if (data.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/portal');
      }
    } catch {
      setError(t('network_error'));
    } finally {
      setLoading(false);
    }
  }

  // Suppress unused t for translations; namespace lookup
  void tErr;

  return (
    <div className="min-h-screen grid lg:grid-cols-5">
      {/* Left — Form (60%) */}
      <div className="col-span-3 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 relative">
        {/* Locale switcher (top-right of form panel) */}
        <div className="absolute top-6 right-6 sm:top-8 sm:right-8">
          <AuthLocaleSwitcher />
        </div>

        <div className="w-full max-w-md mx-auto lg:mx-0">
          {/* Logo */}
          <Image
            src="/logo/babahalgo-horizontal-inverse.png"
            alt="BabahAlgo"
            width={140}
            height={28}
            className="h-7 w-auto mb-12 hidden dark:block"
            priority
          />
          <Image
            src="/logo/babahalgo-horizontal-dual.png"
            alt="BabahAlgo"
            width={140}
            height={28}
            className="h-7 w-auto mb-12 dark:hidden"
            priority
          />

          <h1 className="t-display-sub mb-2">{t('welcome_back')}</h1>
          <p className="t-body text-foreground/60 mb-10">{t('sign_in_subtitle')}</p>

          {/* Mode toggle */}
          <div className="tab-bar mb-8">
            <button
              type="button"
              onClick={() => setMode('admin')}
              className={`tab-btn ${mode === 'admin' ? 'active' : ''}`}
            >
              {t('mode_admin')}
            </button>
            <button
              type="button"
              onClick={() => setMode('license')}
              className={`tab-btn ${mode === 'license' ? 'active' : ''}`}
            >
              {t('mode_license')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'admin' ? (
              <div>
                <label className="t-eyebrow mb-2 block" htmlFor="email-input">{t('email')}</label>
                <Input
                  id="email-input"
                  type="email"
                  placeholder={t('email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="font-mono"
                  required
                  autoComplete="email"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="t-eyebrow mb-2 block" htmlFor="license-input">{t('license_key')}</label>
                  <Input
                    id="license-input"
                    placeholder={t('license_placeholder')}
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    className="font-mono"
                    required
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="t-eyebrow mb-2 block" htmlFor="mt5-input">{t('mt5_account')}</label>
                  <Input
                    id="mt5-input"
                    placeholder={t('mt5_placeholder')}
                    value={mt5Account}
                    onChange={(e) => setMt5Account(e.target.value)}
                    className="font-mono"
                    autoComplete="off"
                    inputMode="numeric"
                  />
                </div>
              </>
            )}

            <div>
              <label className="t-eyebrow mb-2 block" htmlFor="password-input">{t('password')}</label>
              <Input
                id="password-input"
                type="password"
                placeholder={t('password_placeholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 p-3 rounded-md" role="alert">
                {error}
              </div>
            )}

            <Button type="submit" className="btn-primary w-full h-12 text-sm font-medium" disabled={loading}>
              {loading ? t('signing_in') : t('sign_in')}
            </Button>

            <div className="flex items-center justify-between text-sm flex-wrap gap-2">
              <a href="/contact" className="text-foreground/50 hover:text-amber-400 transition-colors">
                {t('forgot_password')}
              </a>
              <a href="/contact" className="text-foreground/50 hover:text-amber-400 transition-colors">
                {t('need_access')}
              </a>
            </div>
          </form>
        </div>
      </div>

      {/* Right — Editorial panel (40%) */}
      <div
        className="hidden lg:flex col-span-2 flex-col justify-center items-center px-12 relative"
        style={{ background: 'var(--brand-midnight)' }}
        aria-hidden="true"
      >
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }} />

        <div className="relative max-w-sm text-center">
          <div className="w-12 h-px bg-amber-500/40 mx-auto mb-8" />
          <blockquote className="font-display text-[28px] leading-snug italic text-foreground/80 mb-8">
            &ldquo;{t('tagline_quote')}&rdquo;
          </blockquote>
          <p className="t-body-sm text-foreground/40 tracking-wide">
            {t('tagline_attribution')}
          </p>
          <div className="w-12 h-px bg-amber-500/40 mx-auto mt-8" />
        </div>
      </div>
    </div>
  );
}
