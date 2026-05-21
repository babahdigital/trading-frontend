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
  group: 'crypto' | 'commodity' | 'forex';
  last: number;
  change24hPct: number;
  currency: 'USD';
}

const GROUP_ICON: Record<Ticker['group'], string> = {
  commodity: '🪙',
  crypto:    '₿',
  forex:     '💱',
};

const LABEL_ICON: Record<string, string> = {
  XAU: '🥇',
  USOIL: '🛢️',
  BTC: '₿',
  ETH: 'Ξ',
  XRP: '✕',
  SOL: '◎',
  EUR: '€',
  DXY: '$',
};

function formatPrice(n: number, group: Ticker['group']): string {
  if (group === 'forex') {
    return n.toFixed(4);
  }
  if (n >= 1000) {
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  if (n >= 100) {
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  if (n >= 1) {
    return n.toLocaleString('en-US', { maximumFractionDigits: 3 });
  }
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

function formatPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

export function TickerBar() {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [failCount, setFailCount] = useState(0);

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
    // Refresh tiap 60s — sesuai cache CDN
    timer = setInterval(load, 60_000);
    return () => { cancelled = true; if (timer) clearInterval(timer); };
  }, []);

  // Dismiss kalau gagal >2x berturut-turut (jangan tampilkan empty bar)
  if (failCount > 2 || tickers.length === 0) return null;

  // Duplicate tickers untuk seamless marquee loop
  const repeated = [...tickers, ...tickers];

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden border-b border-border/40',
        'bg-gradient-to-r from-slate-950/95 via-slate-900/95 to-slate-950/95',
        'text-foreground',
      )}
      role="region"
      aria-label="Live market ticker"
    >
      <div className="ticker-marquee flex whitespace-nowrap py-1.5 will-change-transform">
        {repeated.map((t, i) => {
          const isUp = t.change24hPct >= 0;
          const icon = LABEL_ICON[t.label] ?? GROUP_ICON[t.group];
          return (
            <div
              key={`${t.symbol}-${i}`}
              className="inline-flex items-center gap-2 px-4 sm:px-5 text-xs font-mono shrink-0"
            >
              <span className="text-amber-400/80 text-sm" aria-hidden>{icon}</span>
              <span className="font-semibold tracking-wider text-foreground/90">{t.label}</span>
              <span className="text-foreground tabular-nums">{formatPrice(t.last, t.group)}</span>
              <span
                className={cn(
                  'tabular-nums px-1.5 py-0.5 rounded text-[10px] font-semibold',
                  isUp
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-rose-500/15 text-rose-400',
                )}
              >
                {formatPct(t.change24hPct)}
              </span>
              <span className="text-foreground/30" aria-hidden>·</span>
            </div>
          );
        })}
      </div>
      <style jsx>{`
        .ticker-marquee {
          animation: ticker-scroll 60s linear infinite;
        }
        .ticker-marquee:hover {
          animation-play-state: paused;
        }
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-marquee {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
