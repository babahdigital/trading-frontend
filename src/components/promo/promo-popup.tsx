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

/** Cooldown periode per kategori promo (Pak Abdullah audit 2026-05-22):
 *  - Event hari raya: 1 hari (re-show besok kalau event masih aktif)
 *  - Welcome/evergreen: 7 hari (jangan ganggu user yang sudah lihat)
 *  - Flash-sale: 1 hari (urgency-driven, retry besok kalau masih aktif)
 */
function getCooldownDays(slug: string, hasEvent: boolean): number {
  if (hasEvent) return 1;
  if (slug.startsWith('welcome') || slug.startsWith('evergreen')) return 7;
  return 1; // flash-sale + default
}

function isDismissedRecently(slug: string, cooldownDays: number): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(`${DISMISS_KEY_PREFIX}${slug}`);
    if (!raw) return false;
    const dismissedAt = new Date(raw);
    const ageMs = Date.now() - dismissedAt.getTime();
    const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
    return ageMs < cooldownMs;
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
        // Pick first eligible — server sudah sort by priority (event > flash >
        // evergreen). Respect per-kategori cooldown supaya evergreen tidak
        // tampil setiap hari (Pak Abdullah audit 2026-05-22).
        const eligible = list.find((p) => {
          const hasEvent = !!p.calendarEvent;
          const cooldown = getCooldownDays(p.slug, hasEvent);
          return !isDismissedRecently(p.slug, cooldown);
        });
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 lg:p-8 bg-black/70 backdrop-blur-md animate-in fade-in duration-300"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-popup-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          // Wide-screen presence (Pak Abdullah audit 2026-05-22) — extend
          // max-w sampai 2xl supaya monitor besar tidak terasa floating-tiny
          // tengah viewport.
          'relative w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl',
          // Max height tighter + overflow HIDDEN (bukan auto)
          'max-h-[88vh] lg:max-h-[82vh] overflow-hidden rounded-2xl lg:rounded-3xl bg-card shadow-2xl',
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

        {/* Grid layout — image left + content right.
            Mobile: stacked (image atas).
            md+: 1:1 (image square dari Gemini 1024×1024 fill kolom kiri).
            lg+ wide: 11:14 ratio (image 44% + content 56%) supaya content
            area lebih luas untuk title/body breathing di big screen. */}
        <div className="grid md:grid-cols-2 lg:grid-cols-[11fr_14fr]">
          {/* ─── HERO IMAGE COLUMN ─── */}
          {/*
            Image native dari Gemini = 1024×1024 square (no crop, content utuh).
            Responsive untuk fit:
            - Mobile (<768px): aspect-[5/3] = 1.67:1, image di-crop tipis (object-
              cover) supaya tidak makan viewport tinggi saat stacked.
            - md+ (≥768px): aspect-square, image fill kolom kiri sempurna.
          */}
          <div className="relative aspect-[4/3] md:aspect-square bg-slate-900 overflow-hidden">
            {heroImage ? (
              <>
                {!imageLoaded && (
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-amber-500/30 animate-pulse" aria-hidden />
                  </div>
                )}
                {/* Image full-bleed — scale 105% supaya any thin edge artifact
                    dari Gemini (1-2px edge bleed) ter-crop, fill 100% container.
                    Pak Abdullah audit 2026-05-22: "fill images popup ada sisa
                    putih kiri kanan atas bawah sedikit gamr 1:1". */}
                <Image
                  src={heroImage}
                  alt={title}
                  fill
                  unoptimized
                  className={cn(
                    'object-cover object-center transition-opacity duration-500 scale-[1.04]',
                    imageLoaded ? 'opacity-100' : 'opacity-0',
                  )}
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 100vw, (max-width: 1024px) 56vw, 50vw"
                  onLoad={() => setImageLoaded(true)}
                  priority
                />
                {/* Bottom gradient ONLY — untuk readability urgency chip + discount badge.
                    Sebelumnya ada side-fade `to-card/50` yang di LIGHT theme jadi white
                    margin di right edge — Pak Abdullah audit 2026-05-22 drop entirely.
                    Top gradient juga di-drop supaya image full-bleed atas. */}
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />
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

          {/* ─── CONTENT COLUMN ─── adaptive padding + typography scaling */}
          <div className="relative flex flex-col p-4 sm:p-5 md:p-6 lg:p-8 xl:p-10 2xl:p-12 md:min-h-[400px] lg:min-h-[480px] xl:min-h-[520px] overflow-y-auto">
            {/* Eyebrow — adapts to promo kind (greeting vs discount) */}
            <div className="flex items-center gap-2 mb-3 lg:mb-4">
              <Sparkles className="h-4 w-4 lg:h-5 lg:w-5 text-amber-500" aria-hidden />
              <span className="text-[11px] lg:text-xs font-mono uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400 font-semibold">
                {discountText
                  ? (isEn ? 'Limited Promotion' : 'Penawaran Terbatas')
                  : (isEn ? 'Special Greeting' : 'Ucapan Spesial')}
              </span>
            </div>

            {/* Title — scaled per breakpoint sampai 4xl di 2xl screen */}
            <h2
              id="promo-popup-title"
              className="font-display text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-[42px] font-bold leading-[1.1] tracking-tight mb-3 lg:mb-4 text-foreground"
            >
              {title}
            </h2>

            {/* Body — generous line-height + larger di wide screen */}
            <p className="text-[13px] sm:text-sm md:text-[15px] lg:text-base xl:text-lg 2xl:text-xl text-muted-foreground leading-relaxed mb-4 sm:mb-5 lg:mb-6">
              {body}
            </p>

            {/* Benefit chip — discount only kalau promo punya nilai. Greeting
                tanpa diskon skip chip — clean focus pada title+body. */}
            {discountText && (
              <div className="mb-6 lg:mb-8 inline-flex items-baseline gap-1.5 lg:gap-2 self-start rounded-lg lg:rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 lg:px-4 py-1.5 lg:py-2">
                <span className="text-[10px] lg:text-xs uppercase tracking-wider text-amber-600 dark:text-amber-300 font-mono font-semibold">
                  {isEn ? 'Discount' : 'Diskon'}
                </span>
                <span className="text-lg lg:text-2xl xl:text-3xl font-bold text-amber-700 dark:text-amber-300 tabular-nums leading-none">
                  {discountText}
                </span>
                {promo.discountType === 'PERCENT' && (
                  <span className="text-[10px] lg:text-xs uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70 font-mono">OFF</span>
                )}
              </div>
            )}

            {/* CTAs — spacer push ke bottom on desktop, adaptive sizing */}
            <div className="mt-auto pt-2 flex flex-col-reverse sm:flex-row gap-2.5 lg:gap-3">
              <button
                type="button"
                onClick={dismiss}
                className={cn(
                  'flex-1 px-4 py-3 lg:py-3.5 rounded-lg text-sm lg:text-base font-medium',
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
                  'flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 lg:py-3.5 rounded-lg',
                  'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300',
                  'text-amber-950 font-semibold text-sm lg:text-base transition-all',
                  'shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
                  'hover:scale-[1.02] active:scale-[0.98]',
                )}
              >
                <span>{ctaLabel}</span>
                <ArrowRight className="h-4 w-4 lg:h-5 lg:w-5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </div>

            {/* Fine print — adapts: jika no discount (greeting), pesan beda */}
            <p className="mt-4 lg:mt-5 text-[10px] lg:text-xs text-muted-foreground/60 leading-relaxed">
              {discountText
                ? (isEn
                    ? 'Offer valid while available. Terms apply.'
                    : 'Penawaran berlaku selama tersedia. Syarat & ketentuan berlaku.')
                : (isEn
                    ? 'Warm wishes from the BabahAlgo family.'
                    : 'Salam hangat dari keluarga BabahAlgo.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
