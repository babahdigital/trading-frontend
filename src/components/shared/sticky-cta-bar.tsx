'use client';

/**
 * Shared sticky CTA bar — slot di bottom of viewport untuk hot CTA pages
 * (compare pricing, contact sales, dll). Pakai z-token `z-sticky` supaya
 * tidak konflik dengan nav/modal/toast.
 */
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';

export function StickyCtaBar({
  message,
  ctaLabel,
  href,
  tone = 'amber',
}: {
  message: string;
  ctaLabel: string;
  href: string;
  tone?: 'amber' | 'emerald';
}) {
  const ctaClasses =
    tone === 'emerald'
      ? 'border-emerald-400/40 bg-emerald-500/[0.06] text-emerald-400 hover:bg-emerald-500/[0.12] hover:border-emerald-400/60'
      : 'border-amber-400/40 bg-amber-500/[0.06] text-amber-400 hover:bg-amber-500/[0.12] hover:border-amber-400/60';

  return (
    <div
      id="sticky-cta-bar"
      data-sticky-cta="true"
      className="sticky bottom-0 left-0 right-0 z-sticky border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="layout-container py-3 flex items-center justify-between gap-4">
        <p className="text-xs sm:text-sm text-foreground/70 leading-snug">{message}</p>
        <Link
          href={href}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md border text-xs sm:text-sm font-medium transition-all shrink-0 ${ctaClasses}`}
        >
          {ctaLabel}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
