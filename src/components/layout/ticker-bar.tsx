'use client';

/**
 * Live ticker bar — sticky horizontal marquee dengan harga real-time
 * untuk commodity/crypto/forex/index majors + Indonesia liquid stocks.
 *
 * Refactor 2026-05-22 (Pak Abdullah audit):
 *   - LIVE pill dihapus (terlihat noisy, institusional pakai data saja)
 *   - localStorage cache supaya hot-refresh tidak glitch ke blank state
 *   - Skeleton placeholder selama initial fetch (no pop-in artefact)
 *   - Animation duration LOCKED (90s constant) — sebelumnya dynamic ke
 *     tickers.length × 5s yang bikin speed berubah saat data update mid-loop
 *   - Sticky-CTA bar coordination — saat #sticky-cta-bar visible di viewport,
 *     ticker bottom-fixed offset ke atas sticky bar (jangan menutupi)
 *
 * Source: /api/public/ticker (server aggregates CoinGecko + Yahoo Finance,
 * cached 60s CDN + 30s browser).
 */
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Ticker {
  symbol: string;
  label: string;
  group: 'crypto' | 'commodity' | 'forex' | 'index';
  last: number;
  change24hPct: number;
  currency: 'USD' | 'IDR';
}

// Color coding per asset group — institusional feel pakai color accent
// di label text saja (no emoji per Pak Abdullah 2026-05-22).
const GROUP_COLOR: Record<Ticker['group'], string> = {
  commodity: 'text-amber-400',
  crypto:    'text-orange-400',
  forex:     'text-sky-400',
  index:     'text-violet-400',
};

// Animation duration locked — constant supaya scroll speed konsisten
// terlepas dari jumlah tickers yang berhasil di-fetch. Dengan ~22 tickers
// × 2 (duplicated set), 120s = nyaman dibaca + feel live.
const ANIM_DURATION_S = 120;

// Threshold scroll position (px) yang trigger ticker pindah ke bottom-fixed
const SCROLL_THRESHOLD = 120;

// Reserved right space saat chat icon visible (h-14 + safe-area = ~80px).
// Pak Abdullah audit 2026-05-22: ticker masih menutupi menu floating saat
// scroll. Walau z-100 chat > z-85 ticker, background slate ticker visually
// "lewat di belakang" icon = lihat aneh. Solusi: SELALU reserve 80px kanan
// saat bottom-fixed mode (clean look + future-proof untuk floating banner).
const CHAT_ICON_RESERVE_PX = 80;
// Reserved bottom space minimal supaya tidak terlalu dekat dengan bottom
// nav iOS bar atau Cookie Consent banner.
const SAFE_BOTTOM_PX = 0;

// localStorage key untuk cache tickers — survive hot refresh + offline blip
const CACHE_KEY = 'babah.ticker.cache.v2';
const CACHE_MAX_AGE_MS = 5 * 60 * 1000; // 5 min — beyond ini, treat as stale

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

export function TickerBar() {
  const [tickers, setTickers] = useState<Ticker[]>(() => readCache() ?? []);
  const [failCount, setFailCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const [stickyCtaHeight, setStickyCtaHeight] = useState(0);
  const tickerRef = useRef<HTMLDivElement>(null);

  // Mark hydrated AFTER mount supaya SSR/hydration mismatch tidak warning
  // (cache hanya di-read di client).
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function load() {
      try {
        const res = await fetch('/api/public/ticker', { cache: 'no-store' });
        if (!res.ok) throw new Error('ticker fetch failed');
        const data = await res.json() as { ok: boolean; tickers: Ticker[] };
        if (!cancelled && Array.isArray(data.tickers) && data.tickers.length > 0) {
          // Only replace state kalau jumlah baru ≥ minimum threshold supaya
          // partial fetch (mis. 8 dari 22) tidak gegerkan UI dengan jumlah
          // berkurang. Threshold = 80% dari current count atau 10 (whichever
          // lower) — tetap update kalau memang upgrade.
          setTickers((prev) => {
            const minAcceptable = Math.max(10, Math.floor(prev.length * 0.8));
            if (prev.length > 0 && data.tickers.length < minAcceptable) {
              // Sub-threshold response — keep current data, treat as fail
              return prev;
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

  // Scroll detector — rAF throttle untuk performance.
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

  // Footer observer — fade-out saat footer visible.
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

  // Chat icon visibility listener dihapus 2026-05-22 (Pak Abdullah audit):
  // ticker SEKARANG selalu reserve 80px right saat bottom-fixed, regardless
  // chat icon state — supaya menu floating apapun di pojok kanan-bawah
  // (chat icon, floating banner, future widgets) tidak ter-cover visual.

  // StickyCtaBar coordination — saat #sticky-cta-bar mounted DAN visible,
  // ticker bottom-fixed offset ke atas sticky bar supaya tidak menutupi.
  // Pakai MutationObserver supaya detect mount/unmount per route navigation.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let intersectObs: IntersectionObserver | null = null;
    let resizeObs: ResizeObserver | null = null;
    let currentEl: HTMLElement | null = null;

    const measure = (el: HTMLElement | null) => {
      if (!el) return setStickyCtaHeight(0);
      const rect = el.getBoundingClientRect();
      // Visible jika top edge sudah masuk viewport dari bawah (rect.top < window height)
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
      window.addEventListener('scroll', () => measure(el), { passive: true });
    };

    const tryAttach = () => {
      const el = document.getElementById('sticky-cta-bar');
      if (el && el !== currentEl) {
        intersectObs?.disconnect();
        resizeObs?.disconnect();
        attach(el);
      } else if (!el && currentEl) {
        intersectObs?.disconnect();
        resizeObs?.disconnect();
        currentEl = null;
        setStickyCtaHeight(0);
      }
    };

    tryAttach();
    const mutObs = new MutationObserver(tryAttach);
    mutObs.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutObs.disconnect();
      intersectObs?.disconnect();
      resizeObs?.disconnect();
    };
  }, []);

  // Skeleton placeholder — initial load belum punya data sama sekali (no cache).
  // Render 8 invisible skeleton items dengan width consistent supaya layout
  // shift minimal saat data sampai.
  if (!hydrated) {
    // SSR: render minimal placeholder shell (no animation) — hindari mismatch.
    return (
      <div
        className="relative w-full overflow-hidden border-b border-amber-500/15 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 z-[90]"
        aria-label="Live market ticker"
        aria-busy="true"
      >
        <div className="flex whitespace-nowrap py-2 px-4">
          <div className="h-4 w-full bg-slate-800/40" />
        </div>
      </div>
    );
  }

  // Dismiss kalau gagal >2x berturut-turut DAN belum pernah punya data
  if (failCount > 2 && tickers.length === 0) return null;

  // Initial loading state — hydrated tapi belum ada cache + belum ada fetch result.
  // Tampilkan skeleton shimmer (no pop-in artefact saat data sampai).
  if (tickers.length === 0) {
    return (
      <div
        className="relative w-full overflow-hidden border-b border-amber-500/15 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 z-[90]"
        aria-label="Live market ticker loading"
        aria-busy="true"
      >
        <div className="flex whitespace-nowrap py-2 px-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="inline-flex items-center gap-2.5 shrink-0">
              <span className="inline-block h-3 w-10 rounded bg-slate-800/60 animate-pulse" />
              <span className="inline-block h-3 w-16 rounded bg-slate-800/40 animate-pulse" />
              <span className="inline-block h-3 w-12 rounded bg-slate-800/30 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Duplicate tickers untuk seamless marquee loop (animation: 0 → -50%)
  const repeated = [...tickers, ...tickers];

  // Mode visual:
  //   - "top": normal flow di atas nav (saat scrollY ≤ 120px atau footer visible)
  //   - "bottom-fixed": fixed bottom viewport — floating ticker Bloomberg style.
  //     Offset ke atas sticky-cta-bar kalau visible.
  //   - "hidden": display none saat footer fully visible
  const mode: 'top' | 'bottom-fixed' | 'hidden' =
    footerVisible ? 'hidden'
    : scrolled ? 'bottom-fixed'
    : 'top';

  // Compose inline style: ALWAYS reserve 80px right space saat bottom-fixed
  // supaya chat icon / banner / floating menu di pojok kanan-bawah tidak
  // ter-visual-cover oleh ticker dark background. Bottom offset hanya saat
  // sticky-cta-bar visible.
  const bottomFixedStyle: React.CSSProperties = {};
  if (mode === 'bottom-fixed') {
    // Always reserve right space — clean visual even when chat icon belum
    // visible (e.g., public page belum klik footer Chat AI).
    bottomFixedStyle.right = `${CHAT_ICON_RESERVE_PX}px`;
    if (stickyCtaHeight > 0) bottomFixedStyle.bottom = `${stickyCtaHeight}px`;
    else if (SAFE_BOTTOM_PX > 0) bottomFixedStyle.bottom = `${SAFE_BOTTOM_PX}px`;
  }

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
      )}
      style={mode === 'bottom-fixed' ? bottomFixedStyle : undefined}
      role="region"
      aria-label="Live market ticker"
      aria-hidden={mode === 'hidden'}
    >
      {/* Subtle left-edge fade — entry smooth (replaces LIVE pill) */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-950 to-transparent z-10"
      />

      <div className="relative z-0">
        <div
          className="ticker-marquee flex whitespace-nowrap py-2 will-change-transform"
          style={{ animation: `ticker-scroll ${ANIM_DURATION_S}s linear infinite` }}
        >
          {repeated.map((t, i) => {
            const isUp = t.change24hPct >= 0;
            return (
              <div
                key={`${t.symbol}-${i}`}
                className="inline-flex items-center gap-2.5 px-4 sm:px-5 text-xs font-mono shrink-0"
              >
                <span className={cn('font-bold tracking-[0.05em]', GROUP_COLOR[t.group])}>
                  {t.label}
                </span>
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
                <span className="text-foreground/15" aria-hidden>│</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right edge fade — smooth visual exit */}
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
