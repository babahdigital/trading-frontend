'use client';

/**
 * Shared FAQ accordion — real data dari prisma.Faq.
 * Locale-aware (id ⇄ en fallback ke source ID kalau translation kosong).
 *
 * Native <details>/<summary> supaya zero JS untuk open/close (CSS animate)
 * + accessible by default. Click toggles, ESC focus close.
 *
 * Locale + heading copy lewat props supaya dipakai surface mana saja
 * dengan eyebrow/title tersendiri (register, pricing, solutions, dll).
 */
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
  eyebrow?: string;
  heading: string;
  subtitle?: string;
  moreLink?: { label: string; href: string };
}

export function FaqAccordion({
  items,
  locale,
  eyebrow,
  heading,
  subtitle,
  moreLink,
}: FaqAccordionProps) {
  if (items.length === 0) return null;

  return (
    <section className="my-12">
      <div className="text-center mb-8">
        {eyebrow && <p className="t-eyebrow mb-2">{eyebrow}</p>}
        <h2 className="t-display-section mb-2">{heading}</h2>
        {subtitle && <p className="text-sm text-foreground/60">{subtitle}</p>}
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
              <summary className="flex items-start justify-between gap-3 cursor-pointer px-5 py-4 list-none [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg">
                {/* h3 wrapper kasih semantic heading hierarchy untuk screen
                    reader — <details><summary> sendiri tidak punya role
                    heading, jadi sr-user kehilangan struktur Q/A. */}
                <h3 className="text-sm font-medium text-foreground leading-snug pr-2 m-0">{q}</h3>
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="px-5 pb-5 -mt-1 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {a}
              </div>
            </details>
          );
        })}
      </div>

      {moreLink && (
        <div className="text-center mt-6">
          <Link
            href={moreLink.href}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
          >
            {moreLink.label}
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </section>
  );
}
