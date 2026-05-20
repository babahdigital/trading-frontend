'use client';

/**
 * Portal banner — surface saat user.emailVerifiedAt null.
 *
 * Render conditionally di portal dashboard. CTA "Kirim ulang" trigger
 * POST /api/auth/resend-verification → backend invalidate previous +
 * gen new token + send email. Banner dismissible via local close
 * (sessionStorage), tetap muncul next session sampai verified.
 *
 * 2026-05-20 — Phase A polish. Closing gap dari email verification
 * flow (commit 358267a) — sebelumnya customer tidak punya UI feedback
 * kalau email belum verified atau request resend link.
 */
import { useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useAuth } from '@/lib/auth/auth-context';
import { Mail, X, CheckCircle2, AlertCircle } from 'lucide-react';

const DISMISS_KEY = 'babah.verify_email_dismissed';

export function VerifyEmailBanner({ initialVerified }: { initialVerified: boolean }) {
  const locale = useLocale() as 'id' | 'en';
  const isEn = locale === 'en';
  const { getAuthHeaders } = useAuth();
  const [verified, setVerified] = useState(initialVerified);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [sending, setSending] = useState(false);
  const [sentStatus, setSentStatus] = useState<'idle' | 'success' | 'error' | 'rate_limited'>('idle');

  const resend = useCallback(async () => {
    setSending(true);
    setSentStatus('idle');
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setSentStatus('success');
      } else if (res.status === 429) {
        setSentStatus('rate_limited');
      } else if (res.status === 409) {
        setVerified(true); // backend says already verified — hide banner
      } else {
        setSentStatus('error');
      }
    } catch {
      setSentStatus('error');
    } finally {
      setSending(false);
    }
  }, [getAuthHeaders]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch { /* empty */ }
  }, []);

  if (verified || dismissed) return null;

  if (sentStatus === 'success') {
    return (
      <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="flex-1 text-sm text-emerald-200">
          {isEn
            ? 'Verification email sent. Check your inbox (and spam folder).'
            : 'Email verifikasi sudah dikirim. Cek inbox (dan folder spam).'}
        </div>
        <button onClick={dismiss} aria-label="Close" className="text-emerald-400/70 hover:text-emerald-300">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
      <Mail className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-200 mb-1">
          {isEn ? 'Verify your email address' : 'Verifikasi email Anda'}
        </p>
        <p className="text-xs text-amber-200/80 leading-relaxed mb-3">
          {isEn
            ? 'Confirm your email to secure your account and unlock all features.'
            : 'Konfirmasi email untuk mengamankan akun dan unlock semua fitur.'}
        </p>
        {sentStatus === 'rate_limited' && (
          <div className="flex items-start gap-1.5 text-xs text-red-300/90 mb-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              {isEn
                ? 'Too many resend attempts. Try again in 1 hour.'
                : 'Terlalu banyak permintaan. Coba lagi dalam 1 jam.'}
            </span>
          </div>
        )}
        {sentStatus === 'error' && (
          <div className="flex items-start gap-1.5 text-xs text-red-300/90 mb-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{isEn ? 'Failed to send. Try again later.' : 'Gagal mengirim. Coba lagi nanti.'}</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => void resend()}
          disabled={sending}
          className="text-xs font-medium text-amber-300 hover:text-amber-200 underline disabled:opacity-50"
        >
          {sending
            ? isEn ? 'Sending…' : 'Mengirim…'
            : isEn ? 'Resend verification email' : 'Kirim ulang email verifikasi'}
        </button>
      </div>
      <button onClick={dismiss} aria-label="Close" className="text-amber-400/70 hover:text-amber-300">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
