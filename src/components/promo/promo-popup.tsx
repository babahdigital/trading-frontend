'use client';

/**
 * PromoPopup — editorial-grade promotional dialog dengan trigger-aware display
 * (DELAY / EXIT_INTENT / SCROLL / PAGE_LOAD).
 *
 * Refactor total 2026-05-21 (Pak Abdullah directive):
 *   - Layout: stacked di mobile, side-by-side (image left + content right) di desktop ≥ md
 *   - Image dominant: aspect-square di mobile, full-height left column di desktop
 *   - Animated entry: scale + fade smooth, decorative sparkle
 *   - Skeleton fallback ketika image belum loaded
 *   - Countdown indicator untuk endsAt ≤ 7 hari
 *   - Focus trap + ESC close + click-outside dismiss
 *   - Bilingual everything (title, body, discount, urgency, CTA)
 *
 * Behavior:
 *   - Mount once di root layout
 *   - Fetch /api/cms/promotions/active on mount (locale-aware)
 *   - Display first eligible promo via trigger config
 *   - localStorage flag: `promo-dismissed-{slug}` → don't re-show same day
 *   - Skip kalau /admin or /portal routes (avoid interrupting workflow)
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { X, Sparkles, ArrowRight, Clock } from 'lucide-react';
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
  heroImageUrl_en: string | null;
  ctaLabel: string | null;
  ctaLabel_en: string | null;
  ctaLink: string | null;
  popupTrigger: 'DELAY' | 'EXIT_INTENT' | 'SCROLL' | 'PAGE_LOAD';
  popupDelayMs: number;
  endsAt: string;
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
    /* localStorage disabled / quota — non-fatal */
  }
}

function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return 0;
  const diff = target - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function PromoPopup() {
  const pathname = usePathname();
  const locale = useLocale();
  const isEn = locale === 'en';
  const [promo, setPromo] = useState<ActivePromo | null>(null);
  const [visible, setVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

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
        const res = await fetch(`/api/cms/promotions/active?locale=${locale}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const list: ActivePromo[] = data.promotions ?? [];
        const eligible = list.find((p) => !isDismissedToday(p.slug));
        if (!cancelled && eligible) setPromo(eligible);
      } catch {
        /* silent — popup is non-critical */
      }
    })();
    return () => { cancelled = true; };
  }, [skipRoute, locale]);

  useEffect(() => {
    if (!promo) return;

    if (promo.popupTrigger === 'PAGE_LOAD') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // ESC key to dismiss + body scroll lock saat popup open
  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [visible, dismiss]);

  // Focus trap — focus dialog on open untuk keyboard nav
  useEffect(() => {
    if (visible && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [visible]);

  if (!promo || !visible || skipRoute) return null;

  const title = isEn && promo.popupTitle_en ? promo.popupTitle_en : promo.popupTitle ?? promo.name;
  const body = isEn && promo.popupBody_en ? promo.popupBody_en : promo.popupBody ?? promo.description;
  const ctaLabel = isEn && promo.ctaLabel_en ? promo.ctaLabel_en : promo.ctaLabel ?? (isEn ? 'See the offer' : 'Lihat penawaran');
  const ctaLink = promo.ctaLink ?? '/pricing';

  const heroImage = isEn
    ? (promo.heroImageUrl_en ?? promo.heroImageUrl)
    : (promo.heroImageUrl ?? promo.heroImageUrl_en);

  const discountText = promo.discountValue > 0
    ? promo.discountType === 'PERCENT'
      ? `${promo.discountValue}%`
      : `Rp ${promo.discountValue.toLocaleString('id-ID')}`
    : null;

  const daysLeft = daysUntil(promo.endsAt);
  const urgencyText = daysLeft === 0
    ? (isEn ? 'Ends today' : 'Berakhir hari ini')
    : daysLeft === 1
      ? (isEn ? 'Last day' : 'Hari terakhir')
      : daysLeft <= 7
        ? (isEn ? `${daysLeft} days left` : `${daysLeft} hari tersisa`)
        : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-300"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-popup-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          // Responsive max-width per breakpoint
          'relative w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl',
          // Max height tighter + overflow HIDDEN (bukan auto) — image + content
          // total harus fit di viewport. Sebelumnya overflow-y-auto bikin
          // scroll vertikal di mobile karena image 4:3 + content combined > 90vh.
          'max-h-[88vh] overflow-hidden rounded-2xl bg-card shadow-2xl',
          'border border-amber-500/20 ring-1 ring-white/5',
          'animate-in zoom-in-95 slide-in-from-bottom-4 duration-500',
          'focus:outline-none',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative glow — subtle ambient */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-amber-500/[0.08] blur-3xl" aria-hidden />

        {/* Close button — floating top-right */}
        <button
          type="button"
          onClick={dismiss}
          className={cn(
            'absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full',
            'bg-background/90 backdrop-blur-md text-foreground/70 hover:text-foreground',
            'border border-border/40 shadow-md hover:bg-background hover:scale-105 transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
          )}
          aria-label={isEn ? 'Close' : 'Tutup'}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Grid template untuk side-by-side: image kiri lebih dominant (image
            sekarang 16:9 wide post-processed via sharp, fill kolom natural). */}
        <div className="grid md:grid-cols-[5fr_4fr]">
          {/* ─── HERO IMAGE COLUMN ─── */}
          {/*
            Image sekarang fixed 1024×576 (16:9) post-process sharp cover crop.
            Responsive aspect:
            - Mobile (<768px): aspect-video (16:9 native, match image natural)
            - md+ (≥768px): aspect-auto + min-height supaya kolom kiri ikut
              tinggi content kolom kanan, image cover-fit fill kolom.
          */}
          <div className="relative aspect-video md:aspect-auto md:min-h-[380px] lg:min-h-[420px] bg-gradient-to-br from-amber-900/20 via-amber-500/10 to-transparent overflow-hidden">
            {heroImage ? (
              <>
                {!imageLoaded && (
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-amber-500/30 animate-pulse" aria-hidden />
                  </div>
                )}
                <Image
                  src={heroImage}
                  alt={title}
                  fill
                  unoptimized
                  className={cn(
                    'object-cover object-center transition-opacity duration-500',
                    imageLoaded ? 'opacity-100' : 'opacity-0',
                  )}
                  // Sizes hint untuk responsive loading:
                  // <640px: full viewport width, 640-768: full width, ≥768: ~55% of container
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 100vw, (max-width: 1024px) 56vw, 50vw"
                  onLoad={() => setImageLoaded(true)}
                  priority
                />
                {/* Gradient overlay — gradient lebih kuat di bottom untuk readability badge urgency */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/15 pointer-events-none" />
                {/* Side gradient ke direction content (right edge) — blend transition desktop */}
                <div className="absolute inset-0 hidden md:block bg-gradient-to-r from-transparent via-transparent to-card/50 pointer-events-none" />
              </>
            ) : (
              // Fallback ketika image null — decorative pattern (same aspect)
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-card">
                <Sparkles className="h-16 w-16 text-amber-500/40" aria-hidden />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(245,158,11,0.15),transparent_50%)]" />
              </div>
            )}

            {/* Discount badge — floating top-left, glassmorphism */}
            {discountText && (
              <div className="absolute top-4 left-4 flex items-center gap-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 px-3.5 py-1.5 shadow-lg ring-2 ring-amber-300/50">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-amber-950">
                    {isEn ? 'Save' : 'Hemat'}
                  </span>
                  <span className="text-base font-black text-amber-950 leading-none">{discountText}</span>
                </div>
              </div>
            )}

            {/* Urgency chip — bottom-left atas image */}
            {urgencyText && (
              <div className="absolute bottom-4 left-4">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-2.5 py-1 ring-1 ring-white/10">
                  <Clock className="h-3 w-3 text-amber-400" aria-hidden />
                  <span className="text-[11px] font-medium text-white">{urgencyText}</span>
                </div>
              </div>
            )}
          </div>

          {/* ─── CONTENT COLUMN ─── */}
          {/* Content area scrollable independent kalau memang content terlalu
              panjang (mis. body very long). Padding compact di mobile supaya
              tidak terlalu memakan ruang. */}
          <div className="relative flex flex-col p-4 sm:p-5 md:p-6 lg:p-8 xl:p-9 md:min-h-[400px] lg:min-h-[440px] overflow-y-auto">
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-amber-500" aria-hidden />
              <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400 font-semibold">
                {isEn ? 'Limited Promotion' : 'Penawaran Terbatas'}
              </span>
            </div>

            {/* Title — scaled per breakpoint untuk responsive readability */}
            <h2
              id="promo-popup-title"
              className="font-display text-xl sm:text-2xl md:text-2xl lg:text-3xl font-bold leading-[1.15] tracking-tight mb-2.5 text-foreground"
            >
              {title}
            </h2>

            {/* Body — generous line-height */}
            <p className="text-[13px] sm:text-sm md:text-[15px] text-muted-foreground leading-relaxed mb-4 sm:mb-5">
              {body}
            </p>

            {/* Benefit chips — subtle highlight */}
            {discountText && (
              <div className="mb-6 inline-flex items-baseline gap-1.5 self-start rounded-lg bg-amber-500/10 border border-amber-500/25 px-3 py-1.5">
                <span className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-300 font-mono font-semibold">
                  {isEn ? 'Discount' : 'Diskon'}
                </span>
                <span className="text-lg font-bold text-amber-700 dark:text-amber-300 tabular-nums leading-none">
                  {discountText}
                </span>
                {promo.discountType === 'PERCENT' && (
                  <span className="text-[10px] uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70 font-mono">OFF</span>
                )}
              </div>
            )}

            {/* CTAs — spacer push ke bottom on desktop */}
            <div className="mt-auto pt-2 flex flex-col-reverse sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={dismiss}
                className={cn(
                  'flex-1 px-4 py-3 rounded-lg text-sm font-medium',
                  'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  'border border-border/40 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
                )}
              >
                {isEn ? 'Maybe later' : 'Nanti saja'}
              </button>
              <Link
                href={ctaLink}
                onClick={dismiss}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg',
                  'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300',
                  'text-amber-950 font-semibold text-sm transition-all',
                  'shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
                  'hover:scale-[1.02] active:scale-[0.98]',
                )}
              >
                <span>{ctaLabel}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </div>

            {/* Fine print — disclaimer */}
            <p className="mt-4 text-[10px] text-muted-foreground/60 leading-relaxed">
              {isEn
                ? 'Offer valid while available. Terms apply.'
                : 'Penawaran berlaku selama tersedia. Syarat & ketentuan berlaku.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
