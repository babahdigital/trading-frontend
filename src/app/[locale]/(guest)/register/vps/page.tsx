'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Link } from '@/i18n/navigation';

export default function RegisterVpsPage() {
  const t = useTranslations('register');
  const tVps = useTranslations('register.vps');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', message: '' });

  function set(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/client/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, package: 'VPS_LICENSE' }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(
          data.error?.fieldErrors
            ? Object.values(data.error.fieldErrors).flat().join(', ')
            : t('error_generic')
        );
      }
    } catch {
      setError(tVps('error_submit_failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />

      <main id="main-content">
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="max-w-md mx-auto">
              {submitted ? (
                <div className="card-enterprise text-center">
                  <div className="text-4xl mb-4">&#9989;</div>
                  <h2 className="t-display-sub mb-2">{tVps('success_title')}</h2>
                  <p className="t-lead text-foreground/60 mb-6">{tVps('success_body')}</p>
                  <Link
                    href="/"
                    className="text-foreground/50 hover:text-amber-400 transition-colors text-sm"
                  >
                    {tVps('success_back')}
                  </Link>
                </div>
              ) : (
                <>
                  <p className="t-eyebrow mb-4">{tVps('eyebrow')}</p>
                  <h1 className="t-display-sub mb-2">{tVps('title')}</h1>
                  <p className="t-lead text-foreground/60 mb-10">{tVps('subtitle')}</p>

                  <div className="card-enterprise">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">{t('field_full_name_required')}</label>
                        <Input
                          value={form.name}
                          onChange={(e) => set('name', e.target.value)}
                          placeholder={t('placeholder_name_generic')}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">{t('field_email_required')}</label>
                        <Input
                          type="email"
                          value={form.email}
                          onChange={(e) => set('email', e.target.value)}
                          placeholder={t('placeholder_email_generic')}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">{t('field_phone')}</label>
                        <Input
                          className="font-mono"
                          value={form.phone}
                          onChange={(e) => set('phone', e.target.value)}
                          placeholder={t('placeholder_phone')}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">{t('field_company')}</label>
                        <Input
                          value={form.company}
                          onChange={(e) => set('company', e.target.value)}
                          placeholder={t('placeholder_company_optional')}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">{t('field_message_required')}</label>
                        <Textarea
                          value={form.message}
                          onChange={(e) => set('message', e.target.value)}
                          placeholder={tVps('placeholder_message')}
                          rows={4}
                          required
                        />
                      </div>
                      {error && (
                        <div className="t-body-sm text-red-400 bg-red-500/10 p-3 rounded-md">
                          {error}
                        </div>
                      )}
                      <button type="submit" className="btn-primary w-full" disabled={loading}>
                        {loading ? tVps('btn_submitting') : tVps('btn_submit')}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <EnterpriseFooter />
    </div>
  );
}
