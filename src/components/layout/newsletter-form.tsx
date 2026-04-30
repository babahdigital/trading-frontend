'use client';

/**
 * Newsletter signup form — versi compact (footer).
 *
 * Hanya minta email; nama optional disimpan dari sumber lain (chat-lead /
 * contact-form). Footer space terbatas, jadi tidak collect phone di sini.
 */

import { useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewsletterCopy {
  heading: string;
  blurb: string;
  placeholder: string;
  submit: string;
  submitting: string;
  success_title: string;
  success_body: string;
  error_invalid: string;
  error_generic: string;
}

const COPY: Record<'id' | 'en', NewsletterCopy> = {
  id: {
    heading: 'Riset Mingguan',
    blurb: 'Insight pasar institusional & update produk langsung ke email Anda. Bisa berhenti kapan saja.',
    placeholder: 'nama@email.com',
    submit: 'Berlangganan',
    submitting: 'Menyimpan…',
    success_title: 'Sudah terdaftar',
    success_body: 'Riset terbaru akan kami kirim langsung ke kotak masuk Anda.',
    error_invalid: 'Format email belum valid.',
    error_generic: 'Gagal mendaftar. Silakan coba lagi.',
  },
  en: {
    heading: 'Weekly Research',
    blurb: "Institutional market briefings and product updates, delivered to your inbox. Unsubscribe anytime.",
    placeholder: 'you@email.com',
    submit: 'Subscribe',
    submitting: 'Saving…',
    success_title: "You're in",
    success_body: "We'll send the latest research straight to your inbox.",
    error_invalid: 'That email format looks off.',
    error_generic: 'Could not subscribe. Please try again.',
  },
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function NewsletterForm({ locale }: { locale: 'id' | 'en' }) {
  const copy = COPY[locale];
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email.trim())) {
      setError(copy.error_invalid);
      return;
    }
    setStatus('submitting');
    try {
      const res = await fetch('/api/public/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          locale,
          source: 'FOOTER',
        }),
      });
      if (!res.ok) {
        setStatus('error');
        setError(copy.error_generic);
        return;
      }
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
      setError(copy.error_generic);
    }
  };

  if (status === 'success') {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-[hsl(var(--profit))/30] bg-[hsl(var(--profit))/8] p-4">
        <CheckCircle2 className="h-5 w-5 text-[hsl(var(--profit))] shrink-0 mt-0.5" strokeWidth={2.25} />
        <div>
          <p className="t-body-sm font-semibold text-foreground">{copy.success_title}</p>
          <p className="t-body-sm text-muted-foreground mt-0.5">{copy.success_body}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Mail className="h-4 w-4 text-amber-400" strokeWidth={2.25} aria-hidden />
        <h4 className="t-eyebrow text-foreground/85">{copy.heading}</h4>
      </div>
      <p className="t-body-sm text-muted-foreground mb-3">{copy.blurb}</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={copy.placeholder}
          required
          disabled={status === 'submitting'}
          aria-label={copy.placeholder}
          className={cn(
            'flex-1 rounded-md border border-border bg-background px-3.5 py-2.5 t-body-sm',
            'text-foreground placeholder:text-muted-foreground/70',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
            'disabled:opacity-60',
          )}
        />
        <button
          type="submit"
          disabled={status === 'submitting'}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-md bg-amber-400 text-amber-950',
            'px-4 py-2.5 t-body-sm font-semibold',
            'hover:bg-amber-300 active:scale-[0.98] transition-all',
            'disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {status === 'submitting' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} /> {copy.submitting}
            </>
          ) : (
            copy.submit
          )}
        </button>
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </form>
  );
}
