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
import { cn } from '@/lib/utils';

interface LeadCopy {
  intro_title: string;
  intro_body: string;
  name_label: string;
  name_placeholder: string;
  email_label: string;
  email_placeholder: string;
  consent_label: string;
  submit: string;
  submitting: string;
  privacy: string;
  error_required: string;
  error_email: string;
  error_submit: string;
}

const COPY: Record<'id' | 'en', LeadCopy> = {
  id: {
    intro_title: 'Sebelum mulai',
    intro_body:
      'Boleh kenalan dulu? Datanya kami pakai untuk follow-up via email kalau Anda butuh bantuan tim manusia. Tidak dibagikan ke pihak luar.',
    name_label: 'Nama',
    name_placeholder: 'Nama lengkap',
    email_label: 'Email',
    email_placeholder: 'nama@email.com',
    consent_label: 'Kirim juga riset & update produk via email (opsional).',
    submit: 'Mulai chat',
    submitting: 'Menyimpan…',
    privacy: 'Dengan melanjutkan Anda menyetujui Kebijakan Privasi kami.',
    error_required: 'Mohon lengkapi nama dan email.',
    error_email: 'Format email belum valid.',
    error_submit: 'Gagal menyimpan. Silakan coba lagi.',
  },
  en: {
    intro_title: 'Before we start',
    intro_body:
      "Quick intro? We'll use this only to follow up via email if you need a human teammate. Never shared with third parties.",
    name_label: 'Name',
    name_placeholder: 'Full name',
    email_label: 'Email',
    email_placeholder: 'you@email.com',
    consent_label: 'Also send research and product updates by email (optional).',
    submit: 'Start chat',
    submitting: 'Saving…',
    privacy: 'By continuing you agree to our Privacy Policy.',
    error_required: 'Please provide your name and email.',
    error_email: 'That email format looks off.',
    error_submit: 'Failed to save. Please try again.',
  },
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface ChatLeadFormProps {
  locale: 'id' | 'en';
  referrerPath?: string;
  onSubmitted: () => void;
}

export function ChatLeadForm({ locale, referrerPath, onSubmitted }: ChatLeadFormProps) {
  const copy = COPY[locale];
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError(copy.error_required);
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError(copy.error_email);
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
        setError(copy.error_submit);
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
      setError(copy.error_submit);
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
          <p className="text-sm font-semibold text-foreground">{copy.intro_title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">{copy.intro_body}</p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="block text-xs font-medium text-foreground/85 mb-1">{copy.name_label}</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={copy.name_placeholder}
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
          <span className="block text-xs font-medium text-foreground/85 mb-1">{copy.email_label}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={copy.email_placeholder}
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
          <span className="text-[11px] text-foreground/75 leading-relaxed">{copy.consent_label}</span>
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
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} /> {copy.submitting}
          </>
        ) : (
          copy.submit
        )}
      </button>

      <p className="text-[10px] text-muted-foreground text-center inline-flex items-center gap-1 justify-center w-full">
        <ShieldCheck className="h-3 w-3 text-[hsl(var(--profit))]" strokeWidth={2.25} aria-hidden />
        <span>{copy.privacy}</span>
      </p>
    </form>
  );
}
