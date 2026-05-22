'use client';

/**
 * Live ticker bar — sticky horizontal marquee dengan harga real-time
 * untuk commodity/crypto/forex/index majors + Indonesia liquid stocks.
 *
 * Smooth-update model (refactor 2026-05-22 Pak Abdullah audit):
 *   - Outer container ALWAYS rendered (no conditional return null) — animation
 *     instance tidak unmount/remount saat data berubah (eliminates blip)
 *   - Inner content swaps via children (skeleton ↔ marquee) tapi marquee
 *     keyframe animation tetap continuous
 *   - <TickerItem> React.memo'd — price-only update hanya re-render item itu,
 *     bukan seluruh marquee track
 *   - Min-width tabular-nums prevent layout shift saat angka berubah width
 *   - Symbol list stable (locked dari first successful fetch); subsequent
 *     update hanya touch `last` + `change24hPct` (in-place price update)
 *
 * Position model:
 *   - mode="top": normal flow di atas nav (scrollY ≤ 120px)
 *   - mode="bottom-fixed": fixed bottom viewport saat scroll → offset above
 *     sticky-cta-bar kalau visible (presisi berdampingan, no overlap)
 *   - mode="hidden": footer fully visible, ticker fade-out
 *   - Always reserve 80px right untuk floating menu (chat icon/banner)
 */
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Ticker {
  symbol: string;
  label: string;
  group: 'crypto' | 'commodity' | 'forex' | 'index';
  last: number;
  change24hPct: number;
  currency: 'USD' | 'IDR';
}

const GROUP_COLOR: Record<Ticker['group'], string> = {
  commodity: 'text-amber-400',
  crypto:    'text-orange-400',
  forex:     'text-sky-400',
  index:     'text-violet-400',
};

const ANIM_DURATION_S = 120;
const SCROLL_THRESHOLD = 120;
const CHAT_ICON_RESERVE_PX = 80;
const CACHE_KEY = 'babah.ticker.cache.v2';
const CACHE_MAX_AGE_MS = 5 * 60 * 1000;

function readCache(): Ticker[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; tickers: Ticker[] };
    if (!parsed?.ts || !Array.isArray(parsed.tickers)) return null;
    if (Date.now() - parsed.ts > CACHE_MAX_AGE_MS) return null;
    return parsed.tickers;
  } catch {
    return null;
  }
}

function writeCache(tickers: Ticker[]): void {
  if (typeof window === 'undefined' || tickers.length === 0) return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), tickers }));
  } catch {
    /* quota / disabled — non-fatal */
  }
}

function formatPrice(n: number, group: Ticker['group'], symbol: string, currency: Ticker['currency']): string {
  if (currency === 'IDR') {
    return 'Rp ' + n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
  }
  if (symbol === 'USDIDR') {
    return n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
  }
  if (group === 'forex') {
    return symbol === 'USDJPY' ? n.toFixed(3) : n.toFixed(4);
  }
  if (group === 'index') {
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 100)  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1)    return n.toLocaleString('en-US', { maximumFractionDigits: 3 });
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

function formatPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

// Per-item component memoized — only re-renders saat ticker DATA (last/change)
// berubah, tidak tiap parent re-render. Cegah cascade re-render seluruh marquee
// saat satu price bergerak.
const TickerItem = memo(function TickerItem({ t }: { t: Ticker }) {
  const isUp = t.change24hPct >= 0;
  return (
    <div className="inline-flex items-center gap-2.5 px-4 sm:px-5 text-xs font-mono shrink-0">
      <span className={cn('font-bold tracking-[0.05em] min-w-[36px]', GROUP_COLOR[t.group])}>
        {t.label}
      </span>
      {/* min-w lock prevents layout shift saat angka berubah width
          (mis. 120.50 → 1200.00 atau 4546.20 → 99.99). */}
      <span className="text-foreground/95 tabular-nums min-w-[64px] text-right">
        {formatPrice(t.last, t.group, t.symbol, t.currency)}
      </span>
      <span
        className={cn(
          'tabular-nums px-1.5 py-0.5 rounded text-[10px] font-bold min-w-[56px] text-center',
          isUp
            ? 'bg-emerald-500/15 text-emerald-400'
            : 'bg-rose-500/15 text-rose-400',
        )}
      >
        {isUp ? '▲' : '▼'} {formatPct(t.change24hPct)}
      </span>
      <span className="text-foreground/15" aria-hidden>│</span>
    </div>
  );
}, (prev, next) => {
  // Custom comparator — re-render hanya kalau last/change/currency actually berubah
  const a = prev.t, b = next.t;
  return a.symbol === b.symbol
    && a.last === b.last
    && a.change24hPct === b.change24hPct
    && a.currency === b.currency;
});

// Skeleton items — 8 placeholder, same outer container supaya transition
// dari skeleton ke real marquee tidak unmount outer animation host.
function SkeletonItems() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={`skel-${i}`} className="inline-flex items-center gap-2.5 px-4 sm:px-5 shrink-0">
          <span className="inline-block h-3 w-10 rounded bg-slate-800/60 animate-pulse" />
          <span className="inline-block h-3 w-16 rounded bg-slate-800/40 animate-pulse" />
          <span className="inline-block h-3 w-12 rounded bg-slate-800/30 animate-pulse" />
        </div>
      ))}
    </>
  );
}

export function TickerBar() {
  const [tickers, setTickers] = useState<Ticker[]>(() => readCache() ?? []);
  const [failCount, setFailCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const [stickyCtaHeight, setStickyCtaHeight] = useState(0);
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Data fetcher — in-place update: kalau symbols sama, hanya replace value.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function load() {
      try {
        const res = await fetch('/api/public/ticker', { cache: 'no-store' });
        if (!res.ok) throw new Error('ticker fetch failed');
        const data = await res.json() as { ok: boolean; tickers: Ticker[] };
        if (!cancelled && Array.isArray(data.tickers) && data.tickers.length > 0) {
          setTickers((prev) => {
            const minAcceptable = Math.max(8, Math.floor(prev.length * 0.7));
            if (prev.length > 0 && data.tickers.length < minAcceptable) {
              return prev; // sub-threshold response — keep stable structure
            }
            // Stable order via merge — preserve prev symbol order kalau symbols
            // sama (cuma value update), supaya marquee position tidak loncat.
            // Kalau symbol berubah (new fetch returns different set), fall back
            // ke order baru.
            const sameSymbols = prev.length === data.tickers.length
              && prev.every((p, i) => p.symbol === data.tickers[i]?.symbol);
            if (sameSymbols) {
              // In-place value update — return new array dengan reference baru
              // (supaya React tahu update), tapi struktur identik. TickerItem
              // memo hanya re-render item yang value-nya berubah.
              const updated = prev.map((p) => {
                const fresh = data.tickers.find((t) => t.symbol === p.symbol);
                return fresh ?? p;
              });
              writeCache(updated);
              return updated;
            }
            writeCache(data.tickers);
            return data.tickers;
          });
          setFailCount(0);
        }
      } catch {
        if (!cancelled) setFailCount((c) => c + 1);
      }
    }

    load();
    timer = setInterval(load, 60_000);
    return () => { cancelled = true; if (timer) clearInterval(timer); };
  }, []);

  // Scroll detector
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > SCROLL_THRESHOLD);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Footer observer
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const footer = document.getElementById('enterprise-footer');
    if (!footer) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) setFooterVisible(e.isIntersecting);
      },
      { threshold: 0, rootMargin: '0px 0px -40px 0px' },
    );
    obs.observe(footer);
    return () => obs.disconnect();
  }, []);

  // StickyCtaBar coordination — ticker bottom-fixed sit ABOVE sticky-cta
  // (presisi berdampingan, no overlap). Pakai IntersectionObserver +
  // ResizeObserver + MutationObserver supaya detect per route navigation.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let intersectObs: IntersectionObserver | null = null;
    let resizeObs: ResizeObserver | null = null;
    let scrollHandler: (() => void) | null = null;
    let currentEl: HTMLElement | null = null;

    const measure = (el: HTMLElement | null) => {
      if (!el) return setStickyCtaHeight(0);
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      setStickyCtaHeight(inView ? Math.ceil(rect.height) : 0);
    };

    const attach = (el: HTMLElement) => {
      currentEl = el;
      measure(el);
      intersectObs = new IntersectionObserver(() => measure(el), { threshold: [0, 0.1, 1] });
      intersectObs.observe(el);
      resizeObs = new ResizeObserver(() => measure(el));
      resizeObs.observe(el);
      scrollHandler = () => measure(el);
      window.addEventListener('scroll', scrollHandler, { passive: true });
    };

    const detach = () => {
      intersectObs?.disconnect();
      resizeObs?.disconnect();
      if (scrollHandler) window.removeEventListener('scroll', scrollHandler);
      currentEl = null;
      setStickyCtaHeight(0);
    };

    const tryAttach = () => {
      const el = document.getElementById('sticky-cta-bar');
      if (el && el !== currentEl) {
        detach();
        attach(el);
      } else if (!el && currentEl) {
        detach();
      }
    };

    tryAttach();
    const mutObs = new MutationObserver(tryAttach);
    mutObs.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutObs.disconnect();
      detach();
    };
  }, []);

  // Memoize repeated array — only re-compute saat tickers REFERENCE berubah
  // (in-place value updates dengan stable order tetap trigger ini, tapi
  // memo TickerItem cegah cascade).
  const repeated = useMemo(() => [...tickers, ...tickers], [tickers]);

  // Mode visual
  const mode: 'top' | 'bottom-fixed' | 'hidden' =
    !hydrated ? 'top'
    : footerVisible ? 'hidden'
    : scrolled ? 'bottom-fixed'
    : 'top';

  // Compose inline style untuk bottom-fixed mode
  const bottomFixedStyle: React.CSSProperties = {};
  if (mode === 'bottom-fixed') {
    bottomFixedStyle.right = `${CHAT_ICON_RESERVE_PX}px`;
    if (stickyCtaHeight > 0) bottomFixedStyle.bottom = `${stickyCtaHeight}px`;
  }

  // Decide content untuk inner marquee:
  //   - kalau hydrated DAN punya tickers → render real marquee items
  //   - kalau hydrated tapi tickers kosong (initial fetch + no cache) → skeleton
  //   - kalau gagal >2x + 0 cache → dismissed (container tetap mount, opacity-0)
  const dismissed = failCount > 2 && tickers.length === 0;
  const showSkeleton = hydrated && tickers.length === 0 && !dismissed;
  const showMarquee = hydrated && tickers.length > 0;

  return (
    <div
      ref={tickerRef}
      className={cn(
        'overflow-hidden border-amber-500/15 transition-all duration-300',
        'bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950',
        'text-foreground isolate',
        mode === 'top' && 'relative w-full border-b z-[90]',
        mode === 'bottom-fixed' && 'fixed left-0 right-0 z-[85] border-t shadow-[0_-4px_20px_rgba(0,0,0,0.4)]',
        mode === 'hidden' && 'opacity-0 pointer-events-none',
        dismissed && 'opacity-0 pointer-events-none',
      )}
      style={mode === 'bottom-fixed' ? bottomFixedStyle : undefined}
      role="region"
      aria-label="Live market ticker"
      aria-hidden={mode === 'hidden' || dismissed}
    >
      {/* Left-edge fade */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-950 to-transparent z-10"
      />

      <div className="relative z-0">
        {/* Single marquee track — content swap, animation host TETAP mount.
            Animation duration locked ke ANIM_DURATION_S = predictable speed
            terlepas dari jumlah items. */}
        <div
          className="ticker-marquee flex whitespace-nowrap py-2 will-change-transform"
          style={{ animation: `ticker-scroll ${ANIM_DURATION_S}s linear infinite` }}
        >
          {showMarquee
            ? repeated.map((t, i) => (
                // Key includes index supaya React reconcile duplicated set
                // sebagai separate items (bukan key conflict).
                <TickerItem key={`${t.symbol}-${i}`} t={t} />
              ))
            : showSkeleton
              ? (
                <>
                  <SkeletonItems />
                  <SkeletonItems />
                </>
              )
              : null}
        </div>
      </div>

      {/* Right edge fade */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-slate-950 to-transparent z-10"
      />

      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-marquee:hover {
          animation-play-state: paused !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-marquee {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
