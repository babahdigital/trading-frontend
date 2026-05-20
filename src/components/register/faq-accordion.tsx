'use client';

/**
 * FAQ accordion untuk register page — real data dari prisma.Faq.
 * Locale-aware (id ⇄ en fallback ke source ID kalau translation kosong).
 *
 * Native <details>/<summary> supaya zero JS untuk open/close (CSS animate)
 * + accessible by default. Server renders fully expanded by default? No —
 * `details` collapsed by default. Click toggles, ESC focus close.
 */
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ChevronDown, ArrowRight } from 'lucide-react';

export interface FaqItem {
  id: string;
  question: string;
  question_en: string | null;
  answer: string;
  answer_en: string | null;
}

interface FaqAccordionProps {
  items: FaqItem[];
  locale: 'id' | 'en';
}

export function FaqAccordion({ items, locale }: FaqAccordionProps) {
  const t = useTranslations('register');
  if (items.length === 0) return null;

  return (
    <section className="my-12">
      <div className="text-center mb-8">
        <p className="t-eyebrow mb-2">{t('faq_eyebrow')}</p>
        <h2 className="t-display-section mb-2">{t('faq_heading')}</h2>
        <p className="text-sm text-foreground/60">{t('faq_subtitle')}</p>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const q = locale === 'en' ? (item.question_en ?? item.question) : item.question;
          const a = locale === 'en' ? (item.answer_en ?? item.answer) : item.answer;
          return (
            <details
              key={item.id}
              className="group rounded-lg border border-border/60 bg-card/40 transition-colors hover:border-border open:border-amber-400/30 open:bg-card/60"
            >
              <summary className="flex items-start justify-between gap-3 cursor-pointer px-5 py-4 list-none [&::-webkit-details-marker]:hidden">
                <span className="text-sm font-medium text-foreground leading-snug pr-2">{q}</span>
                <ChevronDown className="w-4 h-4 text-foreground/50 shrink-0 mt-0.5 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="px-5 pb-5 -mt-1 text-sm text-foreground/70 leading-relaxed whitespace-pre-line">
                {a}
              </div>
            </details>
          );
        })}
      </div>

      <div className="text-center mt-6">
        <Link
          href="/faq"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
        >
          {t('faq_more_link')}
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </section>
  );
}
