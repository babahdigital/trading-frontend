'use client';

import { useState } from 'react';

interface FaqClientProps {
  faqs: Array<{ id: string; question: string; answer: string; category: string }>;
}

const fallbackFaqs = [
  { id: '1', question: 'What is BabahAlgo?', answer: 'BabahAlgo is an AI-powered quantitative trading platform that provides automated trading signals, managed accounts, and dedicated VPS infrastructure.', category: 'GENERAL' },
  { id: '2', question: 'How does the AI generate signals?', answer: 'Our proprietary machine learning models analyze market microstructure, order flow, and multi-timeframe patterns to generate high-probability trading signals.', category: 'GENERAL' },
  { id: '3', question: 'What markets do you trade?', answer: 'We primarily focus on major and minor forex pairs, gold (XAUUSD), and select indices through MetaTrader 5.', category: 'TRADING' },
  { id: '4', question: 'Is my capital safe?', answer: 'Your capital remains in your own brokerage account at all times. We never have direct access to your funds. PAMM accounts use regulated broker infrastructure with segregated accounts.', category: 'SECURITY' },
  { id: '5', question: 'Can I cancel anytime?', answer: 'Yes. All plans are month-to-month with no long-term contracts. You can cancel or change plans at any time from your dashboard.', category: 'BILLING' },
];

export function FaqClient({ faqs }: FaqClientProps) {
  const displayFaqs = faqs.length > 0 ? faqs : fallbackFaqs;
  const categories = Array.from(new Set(displayFaqs.map((f) => f.category)));
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-10">
      {categories.map((cat) => (
        <div key={cat}>
          <h2 className="text-lg font-semibold text-primary mb-4 uppercase tracking-wider">{cat}</h2>
          <div className="space-y-2">
            {displayFaqs.filter((f) => f.category === cat).map((faq) => (
              <div key={faq.id} className="border border-border rounded-lg">
                <button
                  onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                  className="w-full flex items-center justify-between p-4 text-left font-medium hover:bg-muted/50 transition-colors"
                >
                  <span>{faq.question}</span>
                  <span className="text-muted-foreground ml-4">{openId === faq.id ? '−' : '+'}</span>
                </button>
                {openId === faq.id && (
                  <div className="px-4 pb-4 text-sm text-muted-foreground">{faq.answer}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
