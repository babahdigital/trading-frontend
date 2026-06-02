'use client';

/**
 * Lead form — VPS License contact request.
 * POST ke /api/client/inquiries (atau endpoint dari service descriptor).
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ServiceDescriptor } from '@/lib/register/service-registry';

interface LeadFormProps {
  service: ServiceDescriptor;
  locale: 'id' | 'en';
}

export function LeadForm({ service, locale }: LeadFormProps) {
  const t = useTranslations('register');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', message: '' });

  function set(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!service.submitEndpoint) {
      setError(t('error_register_failed'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = { ...form, ...(service.extraPayload ?? {}) };
      const res = await fetch(service.submitEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(
          data.error?.fieldErrors
            ? Object.values(data.error.fieldErrors).flat().join(', ')
            : data.error?.message || data.error || t('error_generic'),
        );
      }
    } catch {
      setError(t('error_network'));
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="card-enterprise text-center">
        <div className="mb-4 flex justify-center"><CheckCircle2 className="h-12 w-12 text-emerald-400" /></div>
        <h2 className="t-display-sub mb-2">
          {service.wizard.successTitleKey ? t(service.wizard.successTitleKey) : t('success_register')}
        </h2>
        <p className="t-lead text-foreground/60 mb-6">
          {service.wizard.successBodyKey ? t(service.wizard.successBodyKey) : ''}
        </p>
        <Link
          href="/"
          className="text-foreground/50 hover:text-amber-400 transition-colors text-sm"
        >
          {t('vps.success_back')}
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="t-eyebrow eyebrow-rule mb-4">{t(service.wizard.eyebrowKey)}</p>
      <h1 className="t-display-sub mb-2">{t(service.wizard.titleKey)}</h1>
      <p className="t-lead text-foreground/60 mb-10">{t(service.wizard.subtitleKey)}</p>

      <div className="card-enterprise">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">{t('field_full_name_required')}</label>
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder={t('placeholder_name_company')}
              required
              autoComplete="name"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">{t('field_email_required')}</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder={t('placeholder_email_business')}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">{t('field_phone')}</label>
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder={t('placeholder_phone')}
              autoComplete="tel"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">{t('field_company')}</label>
            <Input
              value={form.company}
              onChange={(e) => set('company', e.target.value)}
              placeholder={t('placeholder_company')}
              autoComplete="organization"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">{t('field_message')}</label>
            <Textarea
              value={form.message}
              onChange={(e) => set('message', e.target.value)}
              placeholder={service.wizard.messagePlaceholderKey ? t(service.wizard.messagePlaceholderKey) : ''}
              rows={4}
            />
          </div>

          {error && (
            <div className="t-body-sm text-red-400 bg-red-500/10 border border-red-500/30 p-3 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !form.name || !form.email}
            className="btn-primary w-full h-11 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {loading
              ? t('btn_processing')
              : service.wizard.submitKey
                ? t(service.wizard.submitKey)
                : t('vps.btn_submit')}
          </button>

          {service.wizard.legalNoteKey && (
            <p className="text-xs text-foreground/50 text-center">
              {t(service.wizard.legalNoteKey)}
            </p>
          )}
        </form>
      </div>

      <p className="mt-6 text-xs text-foreground/50 text-center">
        {t('have_account')}{' '}
        <a href={`/${locale === 'en' ? 'en/' : ''}login`} className="text-amber-400 hover:underline">
          {t('sign_in_link')}
        </a>
      </p>
    </>
  );
}
