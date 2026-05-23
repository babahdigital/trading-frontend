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

// Animation speed — responsive per viewport.
//   Mobile (<640px): 28s — viewport narrower, butuh pulse cepat supaya
//     content flow feel "live" tidak terasa stuck di satu item.
//   Desktop (≥640px): 40s — viewport wider, lebih banyak items visible,
//     bisa slower untuk eye-comfort.
// Iterasi: 120s → 75s → 45s → mobile 28 / desktop 40 (Pak Abdullah
// feedback 2026-05-23: "di mobile masih lambat sekali").
const ANIM_DURATION_MOBILE_S = 28;
const ANIM_DURATION_DESKTOP_S = 40;
const SCROLL_THRESHOLD = 120;
// Right-edge reserve untuk chat FAB:
//   - Mobile (<640px): icon 56px @ right-4 (16px) = 72px total
//   - Desktop (≥640px): icon 56px @ right-6 (24px) = 80px total
// Saat chat icon tidak visible (public pages tanpa active session),
// reserve diciutkan ke padding tipis (12px) — tidak ada FAB to avoid.
const CHAT_RESERVE_MOBILE_PX = 72;
const CHAT_RESERVE_DESKTOP_PX = 80;
const EDGE_PADDING_PX = 12;
// Bumped to v3 — invalidate stale partial caches dari iterasi sebelumnya
// (e.g. cache hanya 3 commodity items dari schema lama).
const CACHE_KEY = 'babah.ticker.cache.v3';
const CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 min — server tetap fetch berkala
const MIN_TICKER_COUNT = 20; // reject cache yang under-populated
// Animation continuity — preserve scroll position across page refreshes
// supaya tidak restart dari 0% setiap navigation.
const ANIM_ANCHOR_KEY = 'babah.ticker.anim-anchor';

function readCache(): Ticker[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; tickers: Ticker[] };
    if (!parsed?.ts || !Array.isArray(parsed.tickers)) return null;
    if (Date.now() - parsed.ts > CACHE_MAX_AGE_MS) return null;
    // Reject under-populated cache (mis. stale schema dari versi lama)
    if (parsed.tickers.length < MIN_TICKER_COUNT) return null;
    return parsed.tickers;
  } catch {
    return null;
  }
}

function writeCache(tickers: Ticker[]): void {
  if (typeof window === 'undefined' || tickers.length < MIN_TICKER_COUNT) return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), tickers }));
  } catch {
    /* quota / disabled — non-fatal */
  }
}

/**
 * Animation anchor — persist a "virtual start timestamp" supaya animation
 * looks continuous across page refreshes. Browser's CSS animation always
 * starts at 0% on mount; kita compensate dengan negative animation-delay
 * yang represent waktu yang sudah "berlalu" sejak anchor.
 *
 * Saved value = epoch ms saat ticker pertama kali shown di session/device.
 * On refresh, compute elapsed = now - anchor, then delay = -(elapsed mod duration).
 */
function getAnimAnchor(): number {
  if (typeof window === 'undefined') return Date.now();
  try {
    const raw = sessionStorage.getItem(ANIM_ANCHOR_KEY);
    const parsed = raw ? parseInt(raw, 10) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  } catch { /* ignore */ }
  const now = Date.now();
  try { sessionStorage.setItem(ANIM_ANCHOR_KEY, String(now)); } catch { /* ignore */ }
  return now;
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
    // Compact wrapper — px-1.5 sm:px-2 (6/8px tiap sisi). Sebelumnya
    // px-2.5 sm:px-3.5 menyebabkan ~28px gap antara separator dan price
    // berikutnya (terlalu boros). Sekarang ~14px = proporsional + readable.
    <div className="inline-flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 text-xs font-mono shrink-0">
      {/* No fixed min-w — let label content drive width. */}
      <span className={cn('font-bold tracking-[0.04em]', GROUP_COLOR[t.group])}>
        {t.label}
      </span>
      {/* tabular-nums prevents intra-symbol digit shift, natural width across symbols. */}
      <span className="text-foreground/95 tabular-nums">
        {formatPrice(t.last, t.group, t.symbol, t.currency)}
      </span>
      <span
        className={cn(
          'tabular-nums px-1.5 py-0.5 rounded text-[10px] font-bold',
          isUp
            ? 'bg-emerald-500/15 text-emerald-400'
            : 'bg-rose-500/15 text-rose-400',
        )}
      >
        {isUp ? '▲' : '▼'} {formatPct(t.change24hPct)}
      </span>
      {/* Separator with own padding — tight inter-item rhythm. */}
      <span className="text-foreground/15 ml-0.5" aria-hidden>│</span>
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
  // Varied widths simulate dynamic content (mimics real items where
  // BTC=7digit, OIL=2digit, XAUUSD=4digit, etc).
  const widths: [string, string, string][] = [
    ['w-7', 'w-12', 'w-10'],
    ['w-9', 'w-16', 'w-11'],
    ['w-6', 'w-10', 'w-9'],
    ['w-10', 'w-14', 'w-12'],
    ['w-8', 'w-12', 'w-10'],
    ['w-7', 'w-16', 'w-11'],
    ['w-9', 'w-11', 'w-9'],
    ['w-6', 'w-14', 'w-10'],
  ];
  return (
    <>
      {widths.map(([wLabel, wPrice, wChange], i) => (
        <div key={`skel-${i}`} className="inline-flex items-center gap-2 px-2.5 sm:px-3.5 shrink-0">
          <span className={cn('inline-block h-3 rounded bg-slate-800/60 animate-pulse', wLabel)} />
          <span className={cn('inline-block h-3 rounded bg-slate-800/40 animate-pulse', wPrice)} />
          <span className={cn('inline-block h-3 rounded bg-slate-800/30 animate-pulse', wChange)} />
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
  const [chatIconVisible, setChatIconVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Viewport tracker untuk responsive right-reserve.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setIsMobile(window.innerWidth < 640);
    update();
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, []);

  // Chat icon visibility — listen ke event yang di-dispatch oleh
  // chat-widget-mount. Saat icon visible, right reserve naik ke chat FAB
  // width+offset. Saat hidden, reserve minimal (edge padding only).
  // Public marketing pages start with chatIconVisible=false (chat only
  // mounts setelah user klik footer "Chat AI").
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Initial probe — kalau button sudah ada di DOM saat mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (document.querySelector('button[aria-label="Open chat assistant"]')) setChatIconVisible(true);

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ visible: boolean }>).detail;
      if (detail) setChatIconVisible(!!detail.visible);
    };
    window.addEventListener('babahalgo:chat-icon-state', handler);
    return () => window.removeEventListener('babahalgo:chat-icon-state', handler);
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
      // Math.round (not ceil) untuk avoid sub-pixel gap antara ticker bottom
      // dan sticky-cta top. Pak Abdullah 2026-05-22: "ada padding bottom tipis
      // tidak mepet dengan sticky-cta-bar" — gap dari Math.ceil over-rounding.
      setStickyCtaHeight(inView ? Math.round(rect.height) : 0);
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

  // Responsive duration + animation continuity calculation.
  // Anchor = waktu pertama kali ticker mount di session (stored di
  // sessionStorage). Elapsed since anchor = berapa detik animation "sudah
  // berjalan" walau CSS animation baru di-mount. Negative animation-delay
  // = CSS treats as if animation already played that duration → ticker
  // appear di posisi mid-loop, NOT 0%.
  //
  // Captured once via useState initializer (pure — runs once on first
  // render, no closure over mutable time).
  const animDuration = isMobile ? ANIM_DURATION_MOBILE_S : ANIM_DURATION_DESKTOP_S;
  const [mountElapsedSec] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const anchor = getAnimAnchor();
    return (Date.now() - anchor) / 1000;
  });
  const animDelay = -(mountElapsedSec % animDuration);

  // Mode visual
  const mode: 'top' | 'bottom-fixed' | 'hidden' =
    !hydrated ? 'top'
    : footerVisible ? 'hidden'
    : scrolled ? 'bottom-fixed'
    : 'top';

  // Compose inline style untuk bottom-fixed mode.
  //   - Right reserve dinamis: kalau chat FAB visible, sediain ruang;
  //     kalau hidden, hanya edge padding tipis (Pak Abdullah 2026-05-22:
  //     "blok kanan terlalu lebar saat fading out tick bar").
  //   - Stacking dengan sticky-cta: bottom = stickyCtaHeight (Math.round-ed
  //     untuk avoid 1px gap dari sub-pixel rounding).
  const bottomFixedStyle: React.CSSProperties = {};
  if (mode === 'bottom-fixed') {
    const reserve = chatIconVisible
      ? (isMobile ? CHAT_RESERVE_MOBILE_PX : CHAT_RESERVE_DESKTOP_PX)
      : EDGE_PADDING_PX;
    bottomFixedStyle.right = `${reserve}px`;
    // ALWAYS set bottom — kalau ada sticky-cta, ticker sit di atas-nya;
    // kalau tidak, ticker sit di bottom viewport (0). Sebelumnya bottom
    // hanya di-set saat stickyCtaHeight>0, menyebabkan landing page (tanpa
    // sticky-cta) tidak punya bottom style → fixed element default ke
    // flow position (TOP) = invisible saat scrolled.
    // Pak Abdullah 2026-05-22: "tick price di halaman / harusnya muncul
    // di bawah saat di scroll" — root cause fixed di sini.
    bottomFixedStyle.bottom = `${stickyCtaHeight}px`;
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
        mode === 'top' && 'relative w-full border-b z-[40]',
        // Ticker bottom-fixed = data display unobtrusive — z-[40] supaya
        // BELOW: nav z-80, mega menu z-85, cookie z-90, mobile menu z-90,
        // chat icon z-100, modals z-100, CMS banner z-50. ABOVE: sticky-cta
        // z-30 (handled via measure offset). Pak Abdullah audit 2026-05-22:
        // ticker tidak boleh menutupi menu/UI interaktif apapun.
        mode === 'bottom-fixed' && 'fixed left-0 right-0 z-[40] border-t shadow-[0_-4px_20px_rgba(0,0,0,0.4)]',
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
            animDelay (negative) sync animation position dengan session anchor
            → looks continuous across refreshes (no reset to 0%).
            animDuration responsive: mobile=28s, desktop=40s. */}
        <div
          className="ticker-marquee flex whitespace-nowrap py-2 will-change-transform"
          style={{
            animationName: 'ticker-scroll',
            animationDuration: `${animDuration}s`,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            animationDelay: `${animDelay}s`,
            animationFillMode: 'both',
          }}
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
