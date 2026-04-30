'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

const TOPIC_VALUES = [
  'signal',
  'pamm',
  'license',
  'institutional',
  'partnership',
  'support',
  'compliance',
  'other',
] as const;

export default function ContactForm() {
  const t = useTranslations('contact');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    topic: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/public/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || t('form_error_submit_failed'));
      }

      setStatus('success');
      setFormData({ name: '', email: '', phone: '', topic: '', message: '' });
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : t('form_error_unexpected'));
    }
  };

  if (status === 'success') {
    return (
      <div className="border border-border rounded-lg p-8 bg-card text-center">
        <h3 className="font-semibold mb-2">{t('form_success_title')}</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {t('form_success_body')}
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="border border-border rounded-md px-6 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          {t('form_success_reset')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2">
          {t('name')}
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full border border-border rounded-md px-4 py-3 bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder={t('form_name_placeholder')}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2">
          {t('email')}
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full border border-border rounded-md px-4 py-3 bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder={t('form_email_placeholder')}
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium mb-2">
          {t('phone_optional')}
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          inputMode="tel"
          autoComplete="tel"
          className="w-full border border-border rounded-md px-4 py-3 bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder={t('form_phone_placeholder')}
        />
      </div>

      <div>
        <label htmlFor="topic" className="block text-sm font-medium mb-2">
          {t('topic')}
        </label>
        <select
          id="topic"
          name="topic"
          value={formData.topic}
          onChange={handleChange}
          required
          className="w-full border border-border rounded-md px-4 py-3 bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="" disabled>
            {t('form_topic_placeholder')}
          </option>
          {TOPIC_VALUES.map((value) => (
            <option key={value} value={value}>
              {t(`topic_${value}` as
                | 'topic_signal'
                | 'topic_pamm'
                | 'topic_license'
                | 'topic_institutional'
                | 'topic_partnership'
                | 'topic_support'
                | 'topic_compliance'
                | 'topic_other')}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-2">
          {t('message')}
        </label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          required
          rows={6}
          className="w-full border border-border rounded-md px-4 py-3 bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
          placeholder={t('form_message_placeholder')}
        />
      </div>

      {status === 'error' && (
        <div className="text-sm text-red-500 border border-red-500/20 rounded-md px-4 py-3 bg-red-500/5">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full bg-accent text-accent-foreground rounded-md px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'submitting' ? t('form_submitting') : t('submit')}
      </button>
    </form>
  );
}
