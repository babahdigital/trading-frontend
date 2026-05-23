'use client';

/**
 * Pre-chat lead capture form.
 *
 * Block percakapan dengan AI sampai calon user submit nama+email.
 * Setelah submit, simpan flag di localStorage supaya tidak ditanya ulang
 * tiap reload. Logged-in user di-bypass — caller sudah cek session sebelum
 * render form ini.
 *
 * Phone field dihapus per Pak Abdullah 2026-04-30 — friction terlalu tinggi
 * untuk top-of-funnel chat lead. Phone tetap dikumpulkan via Inquiry form
 * + register flow di mana user lebih commit.
 */

import { useState, type FormEvent } from 'react';
import { Bot, ShieldCheck, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface ChatLeadFormProps {
  locale: 'id' | 'en';
  referrerPath?: string;
  onSubmitted: () => void;
}

export function ChatLeadForm({ locale, referrerPath, onSubmitted }: ChatLeadFormProps) {
  const t = useTranslations('chat.lead');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError(t('error_required'));
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError(t('error_email'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/chat/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          locale,
          referrerPath,
          consentMarketing: consent,
        }),
      });
      if (!res.ok) {
        setError(t('error_submit'));
        setSubmitting(false);
        return;
      }
      const data = (await res.json().catch(() => null)) as { leadId?: string } | null;
      try {
        localStorage.setItem(
          'babah.chat.lead',
          JSON.stringify({
            id: data?.leadId ?? '',
            email: email.trim().toLowerCase(),
            name: name.trim(),
            createdAt: Date.now(),
          }),
        );
      } catch {
        // localStorage may be disabled — non-blocking
      }
      onSubmitted();
    } catch {
      setError(t('error_submit'));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
          <Bot className="h-4 w-4 text-[hsl(var(--primary))]" strokeWidth={2.25} />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{t('intro_title')}</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">{t('intro_body')}</p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="block text-xs font-medium text-foreground/85 mb-1">{t('name_label')}</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('name_placeholder')}
            autoComplete="name"
            required
            disabled={submitting}
            className={cn(
              'w-full rounded-lg border border-border bg-background px-3 py-2',
              'text-sm text-foreground placeholder:text-muted-foreground/70',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
              'disabled:opacity-60',
            )}
          />
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-foreground/85 mb-1">{t('email_label')}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('email_placeholder')}
            autoComplete="email"
            inputMode="email"
            required
            disabled={submitting}
            className={cn(
              'w-full rounded-lg border border-border bg-background px-3 py-2',
              'text-sm text-foreground placeholder:text-muted-foreground/70',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
              'disabled:opacity-60',
            )}
          />
        </label>

        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            disabled={submitting}
            className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
          />
          <span className="text-[11px] text-foreground/75 leading-relaxed">{t('consent_label')}</span>
        </label>
      </div>

      {error && (
        <div className="text-xs text-destructive border border-destructive/30 bg-destructive/10 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className={cn(
          'w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground',
          'px-4 py-3 text-sm font-semibold',
          'hover:bg-primary/90 active:scale-[0.99] transition-all',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        )}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} /> {t('submitting')}
          </>
        ) : (
          t('submit')
        )}
      </button>

      <p className="text-[10px] text-muted-foreground text-center inline-flex items-center gap-1 justify-center w-full">
        <ShieldCheck className="h-3 w-3 text-[hsl(var(--profit))]" strokeWidth={2.25} aria-hidden />
        <span>{t('privacy')}</span>
      </p>
    </form>
  );
}
