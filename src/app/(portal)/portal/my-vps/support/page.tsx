'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { ArrowLeft, ChevronDown, HelpCircle, Mail, MessageSquare, Send } from 'lucide-react';

const FAQ_KEYS = [
  { q: 'faq_q1', a: 'faq_a1' },
  { q: 'faq_q2', a: 'faq_a2' },
  { q: 'faq_q3', a: 'faq_a3' },
  { q: 'faq_q4', a: 'faq_a4' },
  { q: 'faq_q5', a: 'faq_a5' },
  { q: 'faq_q6', a: 'faq_a6' },
] as const;

export default function MyVpsSupportPage() {
  const t = useTranslations('portal.vps.support');
  const tShared = useTranslations('portal.shared');
  const { getAuthHeaders } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setError(t('validation_required'));
      return;
    }
    if (form.message.length < 10) {
      setError(t('validation_min_length'));
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/client/inquiries', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          message: form.message,
          package: 'VPS_LICENSE',
        }),
      });
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) throw new Error(t('submit_failed'));
      setSent(true);
      setForm({ name: '', email: '', message: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tShared('connection_error'));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/portal/my-vps">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> {t('back')}
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t('heading')}</h1>
          <p className="text-sm text-muted-foreground">{t('tagline')}</p>
        </div>
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <HelpCircle className="w-4 h-4" /> {t('faq_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {FAQ_KEYS.map((item, i) => (
              <div key={i} className="border rounded-lg">
                <button
                  className="w-full flex items-center justify-between p-4 text-left text-sm font-medium hover:bg-accent/50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {t(item.q)}
                  <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', openFaq === i && 'rotate-180')} />
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 text-sm text-muted-foreground">
                    {t(item.a)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">{t('email_label')}</p>
                <p className="text-sm text-muted-foreground">{t('email_value')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('email_response_time')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">{t('telegram_label')}</p>
                <p className="text-sm text-muted-foreground">{t('telegram_handle')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('telegram_response_time')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Send className="w-4 h-4" /> {t('send_message_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center py-8">
              <p className="text-green-400 font-medium mb-2">{t('sent_title')}</p>
              <p className="text-sm text-muted-foreground mb-4">{t('sent_body')}</p>
              <Button variant="outline" size="sm" onClick={() => setSent(false)}>
                {t('sent_again')}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{t('form_name_label')}</label>
                  <Input
                    placeholder={t('form_name_placeholder')}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">{t('form_email_label')}</label>
                  <Input
                    type="email"
                    placeholder={t('form_email_placeholder')}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">{t('form_message_label')}</label>
                <textarea
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder={t('form_message_placeholder')}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>
              {error && (
                <div className="text-sm text-red-400">{error}</div>
              )}
              <Button type="submit" disabled={sending}>
                {sending ? t('submitting') : t('submit')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
