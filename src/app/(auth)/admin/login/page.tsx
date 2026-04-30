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
  Eye, EyeOff, ShieldCheck, MonitorSmartphone, Cog,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/layout/brand-logo';

/**
 * Operator console login — terpisah dari /login (customer portal).
 *
 * Why separate route:
 *   - Customer login flow harus optimized untuk OAuth (Google/Apple) +
 *     conversion-friendly copy ("welcome back", trust chips).
 *   - Operator login lebih ketat: email + password only (no OAuth, no
 *     register link), copy-nya operator-grade ("operator console", "secure
 *     access"). Ada fingerprint kalau ke depan kita pasang TOTP/WebAuthn.
 *   - Semua admin endpoint sudah requireAdmin guard di backend, jadi
 *     "salah masuk pintu" tetap aman, tapi UX lebih jelas pisahkan rail.
 */
export default function AdminLoginPage() {
  const t = useTranslations('auth');
  const tErr = useTranslations('errors');
  const router = useRouter();
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

      if (data.user.role !== 'ADMIN') {
        // Customer accidentally landed on /admin/login — invalidate session
        // di server-side (logout) lalu redirect ke /login.
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => undefined);
        setError(t('admin_only'));
        return;
      }

      try {
        sessionStorage.setItem('user', JSON.stringify(data.user));
      } catch {
        // sessionStorage disabled — non-fatal
      }

      router.push('/admin');
    } catch {
      setError(t('network_error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-background">
      {/* Left rail — operator console editorial panel */}
      <aside
        aria-hidden="true"
        className="hidden lg:flex lg:col-span-5 xl:col-span-4 flex-col justify-between p-10 xl:p-14 relative overflow-hidden bg-[var(--brand-midnight)] text-paper"
      >
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-amber-500/[0.05] blur-3xl pointer-events-none" />

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
          <div className="t-eyebrow mb-5 text-amber-400/80 inline-flex items-center gap-2">
            <MonitorSmartphone className="h-3.5 w-3.5" strokeWidth={2.25} />
            {t('panel_eyebrow_admin')}
          </div>
          <h2 className="font-display text-[26px] leading-tight text-paper/95 mb-4">
            {t('admin_panel_title')}
          </h2>
          <p className="t-body-sm text-paper/55 leading-relaxed">
            {t('admin_panel_body')}
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-3 max-w-sm">
          <CapChip icon={ShieldCheck} label={t('admin_cap_audit')} />
          <CapChip icon={Cog} label={t('admin_cap_config')} />
        </div>
      </aside>

      {/* Right — Form */}
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
              <span className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full border border-primary/30 bg-primary/[0.08] text-[11px] font-medium text-[hsl(var(--primary))] uppercase tracking-wider">
                <MonitorSmartphone className="h-3 w-3" strokeWidth={2.5} />
                {t('admin_console_pill')}
              </span>
              <h1 className="t-display-sub text-foreground mb-2">{t('admin_welcome')}</h1>
              <p className="t-body text-muted-foreground">{t('admin_sign_in_subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <Field
                id="admin-email-input"
                label={t('email')}
                icon={Mail}
                type="email"
                placeholder={t('admin_email_placeholder')}
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
                    {t('admin_sign_in')}
                    <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
                  </>
                )}
              </Button>

              <div className="flex items-center justify-between text-sm pt-2">
                <Link
                  href="/forgot-password"
                  className="text-muted-foreground hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
                >
                  {t('forgot_password')}
                </Link>
                <Link
                  href="/login"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('user_login_link')}
                </Link>
              </div>
            </form>

            <div className="mt-10 pt-6 border-t border-border text-[11px] text-muted-foreground/80 leading-relaxed">
              <Lock className="inline h-3 w-3 mr-1 -mt-0.5" strokeWidth={2.25} />
              {t('admin_security_note')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  icon: LucideIcon;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
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
  required,
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
          required={required}
          className="pl-10 h-11 text-base sm:text-sm"
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
      <label htmlFor="admin-password-input" className="t-eyebrow mb-2 block">
        {label}
      </label>
      <div className="relative">
        <Lock
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
          strokeWidth={2}
        />
        <Input
          id="admin-password-input"
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

function CapChip({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-paper/10 bg-paper/[0.03] px-3 py-2.5">
      <Icon className="h-4 w-4 text-amber-400 shrink-0" strokeWidth={2.25} />
      <span className="text-[10px] uppercase tracking-wider text-paper/70 leading-tight">{label}</span>
    </div>
  );
}
