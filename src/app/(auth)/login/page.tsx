'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthLocaleSwitcher } from '@/components/ui/auth-locale-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Image from 'next/image';
import Link from 'next/link';
import {
  Shield, Lock, Mail, KeyRound, Hash, AlertCircle, ArrowLeft, ArrowRight,
  Eye, EyeOff, ShieldCheck, Layers, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type LoginMode = 'admin' | 'license';

export default function LoginPage() {
  const t = useTranslations('auth');
  const tErr = useTranslations('errors');
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [mt5Account, setMt5Account] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const body =
        mode === 'admin'
          ? { email, password }
          : { licenseKey, mt5Account, password };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-background">
      {/* ─── Left rail — institutional editorial panel (3/12) ─── */}
      <aside
        aria-hidden="true"
        className="hidden lg:flex lg:col-span-5 xl:col-span-4 flex-col justify-between p-10 xl:p-14 relative overflow-hidden bg-[var(--brand-midnight)] text-paper"
      >
        {/* Subtle grid + radial accent */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-amber-500/[0.07] blur-3xl pointer-events-none" />

        {/* Top — back link + brand */}
        <div className="relative z-10 flex flex-col gap-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-paper/60 hover:text-amber-400 transition-colors w-fit"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
            {t('back_to_home')}
          </Link>

          <Image
            src="/logo/babahalgo-header-dark.png"
            alt="BabahAlgo"
            width={180}
            height={36}
            className="h-9 w-auto"
            priority
          />
        </div>

        {/* Middle — editorial copy */}
        <div className="relative z-10 max-w-sm">
          <div className="t-eyebrow mb-5 text-amber-400/80">
            {t('panel_eyebrow')}
          </div>
          <blockquote className="font-display text-[28px] leading-tight text-paper/95 mb-6">
            &ldquo;{t('tagline_quote')}&rdquo;
          </blockquote>
          <p className="t-body-sm text-paper/55 tracking-wide">
            {t('tagline_attribution')}
          </p>
        </div>

        {/* Bottom — trust signals */}
        <div className="relative z-10 grid grid-cols-3 gap-3 max-w-sm">
          <TrustChip icon={ShieldCheck} label={t('trust_zero_custody')} />
          <TrustChip icon={Layers} label={t('trust_audit_chain')} />
          <TrustChip icon={Zap} label={t('trust_zero_touch')} />
        </div>
      </aside>

      {/* ─── Right — Form (full width on mobile, 9/12 on tablet+, 8/12 on xl+) ─── */}
      <div className="col-span-12 lg:col-span-7 xl:col-span-8 flex flex-col">
        {/* Top utility bar */}
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

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 lg:px-16 py-8 sm:py-12">
          <div className="w-full max-w-md">
            {/* Mobile-only logo */}
            <div className="lg:hidden mb-10">
              <Image
                src="/logo/babahalgo-header-dark.png"
                alt="BabahAlgo"
                width={150}
                height={30}
                className="h-7 w-auto hidden dark:block"
                priority
              />
              <Image
                src="/logo/babahalgo-header-light.png"
                alt="BabahAlgo"
                width={150}
                height={30}
                className="h-7 w-auto dark:hidden"
                priority
              />
            </div>

            <div className="mb-8">
              <h1 className="t-display-sub text-foreground mb-2">{t('welcome_back')}</h1>
              <p className="t-body text-muted-foreground">{t('sign_in_subtitle')}</p>
            </div>

            {/* Mode tabs */}
            <div
              role="tablist"
              aria-label={t('login_mode')}
              className="grid grid-cols-2 gap-1 p-1 mb-7 rounded-lg bg-muted/60 border border-border"
            >
              <ModeTab
                active={mode === 'admin'}
                onClick={() => setMode('admin')}
                icon={Shield}
                label={t('mode_admin')}
              />
              <ModeTab
                active={mode === 'license'}
                onClick={() => setMode('license')}
                icon={KeyRound}
                label={t('mode_license')}
              />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {mode === 'admin' ? (
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
              ) : (
                <>
                  <Field
                    id="license-input"
                    label={t('license_key')}
                    icon={KeyRound}
                    type="text"
                    placeholder={t('license_placeholder')}
                    value={licenseKey}
                    onChange={setLicenseKey}
                    autoComplete="off"
                    mono
                    required
                  />
                  <Field
                    id="mt5-input"
                    label={t('mt5_account')}
                    icon={Hash}
                    type="text"
                    inputMode="numeric"
                    placeholder={t('mt5_placeholder')}
                    value={mt5Account}
                    onChange={setMt5Account}
                    autoComplete="off"
                    mono
                  />
                </>
              )}

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
                  href="/contact"
                  className="text-muted-foreground hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
                >
                  {t('need_access')}
                </Link>
              </div>
            </form>

            {/* Footer security note */}
            <div className="mt-10 pt-6 border-t border-border text-[11px] text-muted-foreground/80 leading-relaxed">
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

function ModeTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
        active
          ? 'bg-background text-foreground shadow-sm border border-border'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      {label}
    </button>
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
