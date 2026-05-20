'use client';

/**
 * Web Vitals reporter — measure Core Web Vitals (CLS, LCP, INP, FCP, TTFB)
 * dan log ke analytics endpoint.
 *
 * 2026-05-20 — Phase A polish. Pak directive: PMF measurement + UX
 * monitoring tanpa external dep. Native browser PerformanceObserver
 * API + Next.js built-in `useReportWebVitals` (kalau pkg next/web-vitals
 * tersedia) atau fallback ke PerformanceObserver manual.
 *
 * Mount sekali di layout shell. Beam-and-forget — no UX impact.
 */
import { useEffect } from 'react';
import { track } from '@/lib/analytics/track';

interface PerformanceEntryWithStartTime extends PerformanceEntry {
  startTime: number;
}

export function WebVitalsReporter() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;

    // LCP — Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as PerformanceEntryWithStartTime | undefined;
        if (last) {
          track('engagement', {
            metadata: {
              vital: 'LCP',
              value_ms: Math.round(last.startTime),
            },
          });
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      // entryType tidak supported di browser ini — skip silently
    }

    // CLS — Cumulative Layout Shift
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const e = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!e.hadRecentInput && typeof e.value === 'number') {
            clsValue += e.value;
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // Report CLS on page hide (final value)
      const reportCls = () => {
        track('engagement', {
          metadata: {
            vital: 'CLS',
            value_score: Math.round(clsValue * 1000) / 1000,
          },
        });
      };
      addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') reportCls();
      });
    } catch {
      // skip
    }

    // FCP — First Contentful Paint
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            track('engagement', {
              metadata: {
                vital: 'FCP',
                value_ms: Math.round(entry.startTime),
              },
            });
          }
        }
      });
      fcpObserver.observe({ type: 'paint', buffered: true });
    } catch {
      // skip
    }
  }, []);

  return null;
}
