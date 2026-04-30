'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthLocaleSwitcher } from '@/components/ui/auth-locale-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Link from 'next/link';
import {
  Mail, Lock, AlertCircle, ArrowLeft, ArrowRight,
  Eye, EyeOff, ShieldCheck, Layers, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/layout/brand-logo';
import { useToast } from '@/components/ui/toast';

export default function LoginPage() {
  const t = useTranslations('auth');
  const tErr = useTranslations('errors');
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'same-origin',
      });

      const data = await res.json();

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

      try {
        sessionStorage.setItem('user', JSON.stringify(data.user));
      } catch {
        // sessionStorage disabled — non-fatal
      }

      // Halaman /login KHUSUS untuk customer/portal user.
      // Akun admin yang nyasar ke sini di-redirect ke /admin/login (operator
      // console terpisah). Auth API tetap satu — perbedaan hanya UI flow.
      if (data.user.role === 'ADMIN') {
        toast.push({ tone: 'info', title: t('admin_redirect') });
        router.push('/admin/login');
        return;
      }

      router.push('/portal');
    } catch {
      setError(t('network_error'));
    } finally {
      setLoading(false);
    }
  }

  function handleOAuth(provider: 'google' | 'apple') {
    // OAuth integration pending Wave-30 (backend perlu callback endpoints
    // /api/auth/oauth/{provider}/callback + state CSRF + ID token verify).
    // Untuk sekarang: friendly toast supaya UI siap saat backend ship.
    toast.push({
      tone: 'info',
      title: provider === 'google' ? t('oauth_google_pending') : t('oauth_apple_pending'),
      description: t('oauth_pending_desc'),
    });
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-background">
      {/* ─── Left rail — institutional editorial panel ─── */}
      <aside
        aria-hidden="true"
        className="hidden lg:flex lg:col-span-5 xl:col-span-4 flex-col justify-between p-10 xl:p-14 relative overflow-hidden bg-[var(--brand-midnight)] text-paper"
      >
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-amber-500/[0.07] blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-paper/60 hover:text-amber-400 transition-colors w-fit"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
            {t('back_to_home')}
          </Link>
          <BrandLogo height={36} priority />
        </div>

        <div className="relative z-10 max-w-sm">
          <div className="t-eyebrow mb-5 text-amber-400/80">
            {t('panel_eyebrow_user')}
          </div>
          <blockquote className="font-display text-[28px] leading-tight text-paper/95 mb-6">
            &ldquo;{t('tagline_quote')}&rdquo;
          </blockquote>
          <p className="t-body-sm text-paper/55 tracking-wide">
            {t('tagline_attribution')}
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-3 max-w-sm">
          <TrustChip icon={ShieldCheck} label={t('trust_zero_custody')} />
          <TrustChip icon={Layers} label={t('trust_audit_chain')} />
          <TrustChip icon={Zap} label={t('trust_zero_touch')} />
        </div>
      </aside>

      {/* ─── Right — Form ─── */}
      <div className="col-span-12 lg:col-span-7 xl:col-span-8 flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border lg:border-transparent">
          <Link
            href="/"
            className="lg:hidden inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
            {t('back_to_home')}
          </Link>
          <span className="lg:hidden flex-1" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AuthLocaleSwitcher />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 lg:px-16 py-8 sm:py-12">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-10">
              <BrandLogo height={28} priority />
            </div>

            <div className="mb-8">
              <h1 className="t-display-sub text-foreground mb-2">{t('welcome_back')}</h1>
              <p className="t-body text-muted-foreground">{t('user_sign_in_subtitle')}</p>
            </div>

            {/* OAuth providers — placeholder, ready saat backend ship Wave-30 */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <OAuthButton provider="google" label={t('continue_with_google')} onClick={() => handleOAuth('google')} />
              <OAuthButton provider="apple" label={t('continue_with_apple')} onClick={() => handleOAuth('apple')} />
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider">
                <span className="bg-background px-3 text-muted-foreground">
                  {t('or_email')}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <Field
                id="email-input"
                label={t('email')}
                icon={Mail}
                type="email"
                placeholder={t('email_placeholder')}
                value={email}
                onChange={setEmail}
                autoComplete="email"
                required
              />

              <PasswordField
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
                placeholder={t('password_placeholder')}
                label={t('password')}
                showLabel={t('show_password')}
                hideLabel={t('hide_password')}
              />

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={2.25} />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-sm font-semibold gap-2"
              >
                {loading ? (
                  <>
                    <span
                      aria-hidden
                      className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin"
                    />
                    {t('signing_in')}
                  </>
                ) : (
                  <>
                    {t('sign_in')}
                    <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
                  </>
                )}
              </Button>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm pt-2">
                <Link
                  href="/forgot-password"
                  className="text-muted-foreground hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
                >
                  {t('forgot_password')}
                </Link>
                <Link
                  href="/register/signal"
                  className="text-muted-foreground hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
                >
                  {t('no_account_register')}
                </Link>
              </div>
            </form>

            <div className="mt-10 pt-6 border-t border-border text-[11px] text-muted-foreground/80 leading-relaxed">
              {/* Operator console (/admin/login) sengaja TIDAK di-link dari sini.
                  Reasoning: customer login adalah surface publik dan operator URL
                  tidak perlu di-discover lewat halaman customer. Operator yang sah
                  punya bookmark internal atau dapat URL via onboarding tim. */}
              <Lock className="inline h-3 w-3 mr-1 -mt-0.5" strokeWidth={2.25} />
              {t('security_note')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───

interface FieldProps {
  id: string;
  label: string;
  icon: LucideIcon;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  inputMode?: 'numeric' | 'text';
  required?: boolean;
  mono?: boolean;
}

function Field({
  id,
  label,
  icon: Icon,
  type = 'text',
  placeholder,
  value,
  onChange,
  autoComplete,
  inputMode,
  required,
  mono,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="t-eyebrow mb-2 block">
        {label}
      </label>
      <div className="relative">
        <Icon
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
          strokeWidth={2}
        />
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          inputMode={inputMode}
          required={required}
          className={cn('pl-10 h-11 text-base sm:text-sm', mono && 'font-mono')}
        />
      </div>
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  label,
  showLabel,
  hideLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
  label: string;
  showLabel: string;
  hideLabel: string;
}) {
  return (
    <div>
      <label htmlFor="password-input" className="t-eyebrow mb-2 block">
        {label}
      </label>
      <div className="relative">
        <Lock
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
          strokeWidth={2}
        />
        <Input
          id="password-input"
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete="current-password"
          className="pl-10 pr-11 h-11 text-base sm:text-sm"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? hideLabel : showLabel}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
        >
          {show ? (
            <EyeOff className="h-4 w-4" strokeWidth={2} />
          ) : (
            <Eye className="h-4 w-4" strokeWidth={2} />
          )}
        </button>
      </div>
    </div>
  );
}

function OAuthButton({
  provider,
  label,
  onClick,
}: {
  provider: 'google' | 'apple';
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 h-11 px-3 rounded-md',
        'border border-border bg-card hover:bg-muted/60',
        'text-sm font-medium text-foreground',
        'transition-colors active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      )}
    >
      {provider === 'google' ? <GoogleIcon /> : <AppleIcon />}
      <span className="truncate">{label}</span>
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 fill-current text-foreground" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.07h.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function TrustChip({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-paper/10 bg-paper/[0.03] px-3 py-3 text-center">
      <Icon className="h-4 w-4 text-amber-400" strokeWidth={2.25} />
      <span className="text-[10px] uppercase tracking-wider text-paper/60 leading-tight">{label}</span>
    </div>
  );
}
