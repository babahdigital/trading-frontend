'use client';

import { useState } from 'react';

const TOPICS = [
  { value: 'signal', label: 'Signal Service' },
  { value: 'pamm', label: 'PAMM Account' },
  { value: 'license', label: 'VPS License' },
  { value: 'institutional', label: 'Institutional Mandate' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'support', label: 'Technical Support' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'other', label: 'Other' },
];

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
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
        throw new Error(data?.message || 'Failed to submit inquiry. Please try again.');
      }

      setStatus('success');
      setFormData({ name: '', email: '', topic: '', message: '' });
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
  };

  if (status === 'success') {
    return (
      <div className="border border-border rounded-lg p-8 bg-card text-center">
        <h3 className="font-semibold mb-2">Message sent</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Thank you for reaching out. We will respond within 1-2 business days.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="border border-border rounded-md px-6 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2">
          Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full border border-border rounded-md px-4 py-3 bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Your full name"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full border border-border rounded-md px-4 py-3 bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="topic" className="block text-sm font-medium mb-2">
          Topic
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
            Select a topic
          </option>
          {TOPICS.map((topic) => (
            <option key={topic.value} value={topic.value}>
              {topic.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-2">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          required
          rows={6}
          className="w-full border border-border rounded-md px-4 py-3 bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
          placeholder="How can we help?"
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
        {status === 'submitting' ? 'Sending...' : 'Send message'}
      </button>
    </form>
  );
}
