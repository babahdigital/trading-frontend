'use client';

/**
 * Live ticker bar — sticky horizontal marquee dengan harga real-time
 * untuk XAU/USOIL/BTC/ETH/XRP/SOL/EUR/DXY. Tampil di top of public pages.
 *
 * Pak Abdullah directive 2026-05-21: "bar price jalan seperti XAUUSD USOIL
 * BTCUSDT XRPUSDT, hanya pair yang liquid dan dynamis seperti web bursa saham
 * itu juga gabungan forex dan crypto".
 *
 * Source: /api/public/ticker (server aggregates CoinGecko crypto + Yahoo
 * Finance commodity/forex, cached 60s CDN).
 *
 * UX:
 *   - Auto-marquee animation (CSS keyframe, pause on hover)
 *   - Duplicate ticker set untuk seamless loop
 *   - Per-symbol icon emoji untuk visual scan
 *   - Color-coded change% (green up, red down)
 *   - Polling refresh tiap 60 detik
 *   - Skeleton sebelum data loaded, dismiss kalau API down >2x
 */
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Ticker {
  symbol: string;
  label: string;
  group: 'crypto' | 'commodity' | 'forex' | 'index';
  last: number;
  change24hPct: number;
  currency: 'USD' | 'IDR';
}

const GROUP_ICON: Record<Ticker['group'], string> = {
  commodity: '🪙',
  crypto:    '₿',
  forex:     '💱',
  index:     '📊',
};

const LABEL_ICON: Record<string, string> = {
  // Commodities
  XAU: '🥇',
  XAG: '🥈',
  WTI: '🛢️',
  NATGAS: '🔥',
  COPPER: '🟫',
  // Crypto
  BTC: '₿',
  ETH: 'Ξ',
  XRP: '✕',
  SOL: '◎',
  BNB: '🟡',
  ADA: '⚡',
  DOGE: '🐕',
  AVAX: '🔺',
  // Forex
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: '🇦🇺',
  CAD: '🇨🇦',
  CHF: '🇨🇭',
  IDR: '🇮🇩',
  DXY: '$',
  // Index
  'S&P500': '📈',
  NASDAQ: '💻',
  IHSG: '🇮🇩',
  // Indonesian blue-chip stocks — bank icon + telco/automotive
  BBCA: '🏦',
  BBRI: '🏦',
  TLKM: '📡',
  ASII: '🚗',
};

function formatPrice(n: number, group: Ticker['group'], symbol: string, currency: Ticker['currency']): string {
  // IDR native (Indonesian stocks BBCA/BBRI/TLKM/ASII + IHSG) — format
  // Rp dengan thousand separator id-ID, no decimals (saham Indonesia
  // di-quote integer per lembar).
  if (currency === 'IDR') {
    return 'Rp ' + n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
  }
  // USDIDR pair (forex IDR rate)
  if (symbol === 'USDIDR') {
    return n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
  }
  if (group === 'forex') {
    // JPY pairs typically 3 decimals (e.g. 154.235), others 4 decimals
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

// Threshold scroll position (px) yang trigger ticker pindah ke bottom-fixed
const SCROLL_THRESHOLD = 120;
// Reserved right space saat chat icon visible (h-14 + bottom-6 area = ~80px)
const CHAT_ICON_RESERVE_PX = 80;

export function TickerBar() {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [failCount, setFailCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const [chatIconVisible, setChatIconVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function load() {
      try {
        const res = await fetch('/api/public/ticker', { cache: 'no-store' });
        if (!res.ok) throw new Error('ticker fetch failed');
        const data = await res.json() as { ok: boolean; tickers: Ticker[] };
        if (!cancelled && Array.isArray(data.tickers) && data.tickers.length > 0) {
          setTickers(data.tickers);
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

  // Scroll detector — saat user scroll > 120px, ticker stick ke bottom viewport.
  // rAF throttle untuk performance (scroll event high frequency).
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
    onScroll(); // initial check
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Footer observer — saat footer masuk viewport, ticker fade-out supaya tidak
  // overlap link footer. Footer dianggap visible kalau top edge masuk viewport
  // (lebih awal dari fully-visible — supaya ticker hilang sebelum overlap).
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

  // Chat icon visibility — sync via custom event dari ChatWidgetMount supaya
  // ticker reserve space kanan saat icon visible (no overlap di pojok kanan
  // bottom).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ visible: boolean }>).detail;
      setChatIconVisible(Boolean(detail?.visible));
    };
    window.addEventListener('babahalgo:chat-icon-state', handler as EventListener);
    return () => window.removeEventListener('babahalgo:chat-icon-state', handler as EventListener);
  }, []);

  // Dismiss kalau gagal >2x berturut-turut (jangan tampilkan empty bar)
  if (failCount > 2 || tickers.length === 0) return null;

  // Duplicate tickers untuk seamless marquee loop
  const repeated = [...tickers, ...tickers];

  // Animation duration scales dengan jumlah tickers supaya speed konstan
  // (~5s per item). 24 items × 5s = 120s loop. Smaller = faster scroll,
  // bigger = lambat. 5s/item adalah sweet spot — slow enough to read,
  // fast enough untuk feel live.
  const animDuration = Math.max(60, tickers.length * 5);

  // Mode visual:
  //   - "top": normal flow di atas nav (saat scrollY ≤ 120px atau footer visible)
  //   - "bottom-fixed": fixed bottom viewport (saat scrollY > 120px DAN footer
  //     belum visible) — floating ticker yang Bloomberg/TradingView style.
  //   - "hidden": display none saat footer fully visible (jangan overlap link)
  const mode: 'top' | 'bottom-fixed' | 'hidden' =
    footerVisible ? 'hidden'
    : scrolled ? 'bottom-fixed'
    : 'top';

  // Right offset reserve untuk chat icon (h-14 w-14 + safe-area bottom right).
  // Apply hanya di bottom-fixed mode supaya tidak terpotong di top mode.
  const rightReserveStyle = mode === 'bottom-fixed' && chatIconVisible
    ? { right: `${CHAT_ICON_RESERVE_PX}px` }
    : undefined;

  return (
    <div
      className={cn(
        'overflow-hidden border-amber-500/15 transition-all duration-300',
        'bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950',
        'text-foreground isolate',
        // Per-mode positioning
        mode === 'top' && 'relative w-full border-b z-[90]',
        mode === 'bottom-fixed' && 'fixed left-0 right-0 bottom-0 z-[85] border-t shadow-[0_-4px_20px_rgba(0,0,0,0.4)]',
        mode === 'hidden' && 'opacity-0 pointer-events-none',
      )}
      style={rightReserveStyle}
      role="region"
      aria-label="Live market ticker"
      aria-hidden={mode === 'hidden'}
    >
      {/* Live indicator pill — z-20 di atas marquee (z-0), absolute left+bottom-aligned */}
      <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center pl-3 pr-2 pointer-events-none">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/25 border border-rose-500/50 backdrop-blur-md">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-75" />
            <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-rose-300">LIVE</span>
        </span>
      </div>

      {/* Marquee track — padded left supaya tidak overlap LIVE pill. Use inline
          style untuk animation duration (styled-jsx dynamic var kadang stuck di
          hydration). Keyframes defined inline via <style>. */}
      <div className="pl-20 sm:pl-24 relative z-0">
        <div
          className="ticker-marquee flex whitespace-nowrap py-2 will-change-transform"
          style={{ animation: `ticker-scroll ${animDuration}s linear infinite` }}
        >
          {repeated.map((t, i) => {
            const isUp = t.change24hPct >= 0;
            const icon = LABEL_ICON[t.label] ?? GROUP_ICON[t.group];
            return (
              <div
                key={`${t.symbol}-${i}`}
                className="inline-flex items-center gap-2 px-4 sm:px-5 text-xs font-mono shrink-0"
              >
                <span className="text-sm leading-none" aria-hidden>{icon}</span>
                <span className="font-semibold tracking-wider text-amber-300/90">{t.label}</span>
                <span className="text-foreground tabular-nums">{formatPrice(t.last, t.group, t.symbol, t.currency)}</span>
                <span
                  className={cn(
                    'tabular-nums px-1.5 py-0.5 rounded text-[10px] font-bold',
                    isUp
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/20',
                  )}
                >
                  {isUp ? '▲' : '▼'} {formatPct(t.change24hPct)}
                </span>
                <span className="text-foreground/20 mx-1" aria-hidden>•</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right edge fade — smooth visual exit untuk scrolling content */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-slate-950 to-transparent"
      />

      {/* Keyframe global — di-define via standard <style> (bukan styled-jsx
          dynamic) supaya tidak stuck saat hydration. Animation duration di-pass
          via inline style di marquee div. */}
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
