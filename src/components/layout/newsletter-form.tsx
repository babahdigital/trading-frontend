'use client';

/**
 * Newsletter signup form — versi compact (footer).
 *
 * Hanya minta email; nama optional disimpan dari sumber lain (chat-lead /
 * contact-form). Footer space terbatas, jadi tidak collect phone di sini.
 */

import { useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function NewsletterForm({ locale }: { locale: 'id' | 'en' }) {
  const t = useTranslations('newsletter');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email.trim())) {
      setError(t('error_invalid'));
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
        setError(t('error_generic'));
        return;
      }
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
      setError(t('error_generic'));
    }
  };

  if (status === 'success') {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-[hsl(var(--profit))/30] bg-[hsl(var(--profit))/8] p-4">
        <CheckCircle2 className="h-5 w-5 text-[hsl(var(--profit))] shrink-0 mt-0.5" strokeWidth={2.25} />
        <div>
          <p className="t-body-sm font-semibold text-foreground">{t('success_title')}</p>
          <p className="t-body-sm text-muted-foreground mt-0.5">{t('success_body')}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Mail className="h-4 w-4 text-amber-400" strokeWidth={2.25} aria-hidden />
        <h4 className="t-eyebrow text-foreground/85">{t('heading')}</h4>
      </div>
      <p className="t-body-sm text-muted-foreground mb-3">{t('blurb')}</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('placeholder')}
          required
          disabled={status === 'submitting'}
          aria-label={t('placeholder')}
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
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} /> {t('submitting')}
            </>
          ) : (
            t('submit')
          )}
        </button>
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </form>
  );
}
