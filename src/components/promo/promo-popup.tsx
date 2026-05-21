'use client';

/**
 * PromoPopup — customer-facing popup yang surface active promo dengan
 * trigger-aware display (DELAY / EXIT_INTENT / SCROLL / PAGE_LOAD).
 *
 * Behavior:
 *   - Mount once di root layout
 *   - Fetch /api/cms/promotions/active on mount
 *   - Display first eligible promo via trigger config
 *   - localStorage flag: `promo-dismissed-{slug}` → don't re-show same day
 *   - Skip kalau /admin or /portal routes (avoid interrupting workflow)
 */
import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivePromo {
  id: string;
  slug: string;
  name: string;
  name_en: string | null;
  description: string;
  description_en: string | null;
  discountType: 'PERCENT' | 'FIXED_IDR';
  discountValue: number;
  popupTitle: string | null;
  popupTitle_en: string | null;
  popupBody: string | null;
  popupBody_en: string | null;
  heroImageUrl: string | null;
  ctaLabel: string | null;
  ctaLabel_en: string | null;
  ctaLink: string | null;
  popupTrigger: 'DELAY' | 'EXIT_INTENT' | 'SCROLL' | 'PAGE_LOAD';
  popupDelayMs: number;
  calendarEvent: { slug: string; templateKey: string; name: string } | null;
}

const DISMISS_KEY_PREFIX = 'promo-dismissed-';

function isDismissedToday(slug: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(`${DISMISS_KEY_PREFIX}${slug}`);
    if (!raw) return false;
    const dismissedAt = new Date(raw);
    const today = new Date();
    return dismissedAt.toDateString() === today.toDateString();
  } catch {
    return false;
  }
}

function markDismissed(slug: string) {
  try {
    localStorage.setItem(`${DISMISS_KEY_PREFIX}${slug}`, new Date().toISOString());
  } catch {
    // localStorage disabled / quota — non-fatal
  }
}

export function PromoPopup() {
  const pathname = usePathname();
  const locale = useLocale();
  const isEn = locale === 'en';
  const [promo, setPromo] = useState<ActivePromo | null>(null);
  const [visible, setVisible] = useState(false);

  // Skip routes yang punya workflow (admin console, portal dashboard) supaya
  // tidak interupsi. Public landing/marketing surface = OK target.
  const skipRoute = pathname.startsWith('/admin')
    || pathname.startsWith('/portal')
    || pathname.startsWith('/login')
    || pathname.startsWith('/register')
    || pathname.startsWith('/checkout');

  useEffect(() => {
    if (skipRoute) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/cms/promotions/active', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const list: ActivePromo[] = data.promotions ?? [];
        // Pick first non-dismissed
        const eligible = list.find((p) => !isDismissedToday(p.slug));
        if (!cancelled && eligible) {
          setPromo(eligible);
        }
      } catch {
        // silent — popup is non-critical
      }
    })();
    return () => { cancelled = true; };
  }, [skipRoute]);

  // Trigger logic
  useEffect(() => {
    if (!promo) return;

    if (promo.popupTrigger === 'PAGE_LOAD') {
      setVisible(true);
      return;
    }

    if (promo.popupTrigger === 'DELAY') {
      const t = setTimeout(() => setVisible(true), promo.popupDelayMs ?? 3000);
      return () => clearTimeout(t);
    }

    if (promo.popupTrigger === 'SCROLL') {
      const handler = () => {
        if (window.scrollY > window.innerHeight * 0.5) {
          setVisible(true);
          window.removeEventListener('scroll', handler);
        }
      };
      window.addEventListener('scroll', handler, { passive: true });
      return () => window.removeEventListener('scroll', handler);
    }

    if (promo.popupTrigger === 'EXIT_INTENT') {
      const handler = (e: MouseEvent) => {
        if (e.clientY < 20) {
          setVisible(true);
          document.removeEventListener('mouseleave', handler);
        }
      };
      document.addEventListener('mouseleave', handler);
      return () => document.removeEventListener('mouseleave', handler);
    }
  }, [promo]);

  const dismiss = useCallback(() => {
    if (!promo) return;
    setVisible(false);
    markDismissed(promo.slug);
  }, [promo]);

  if (!promo || !visible || skipRoute) return null;

  const title = isEn && promo.popupTitle_en ? promo.popupTitle_en : promo.popupTitle ?? promo.name;
  const body = isEn && promo.popupBody_en ? promo.popupBody_en : promo.popupBody ?? promo.description;
  const ctaLabel = isEn && promo.ctaLabel_en ? promo.ctaLabel_en : promo.ctaLabel ?? (isEn ? 'See offer' : 'Lihat penawaran');
  const ctaLink = promo.ctaLink ?? '/pricing';

  const discountText = promo.discountValue > 0
    ? promo.discountType === 'PERCENT'
      ? `${promo.discountValue}% ${isEn ? 'OFF' : 'OFF'}`
      : `Rp ${promo.discountValue.toLocaleString('id-ID')} OFF`
    : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-xl border-2 border-amber-500/30 bg-card shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur text-foreground/70 hover:text-foreground hover:bg-background transition-colors"
          aria-label={isEn ? 'Close' : 'Tutup'}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero image */}
        {promo.heroImageUrl && (
          <div className="relative w-full aspect-[16/9] bg-muted">
            <Image
              src={promo.heroImageUrl}
              alt={title}
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 512px"
            />
            {/* Discount badge overlay */}
            {discountText && (
              <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-amber-500 text-amber-950 text-sm font-bold shadow-lg">
                {discountText}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400">
                {isEn ? 'Limited Offer' : 'Penawaran Terbatas'}
              </span>
            </div>
            <h2 className="text-xl font-semibold leading-tight mb-2">{title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={dismiss}
              className="flex-1 px-4 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isEn ? 'Maybe later' : 'Nanti saja'}
            </button>
            <Link
              href={ctaLink}
              onClick={dismiss}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md',
                'bg-amber-500 hover:bg-amber-600 text-amber-950 font-medium text-sm transition-colors',
              )}
            >
              {ctaLabel}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
