'use client';

/**
 * Auto-track pageview on route change.
 *
 * Mount sekali di layout shell (e.g. `app/layout.tsx`). Hook listen ke
 * Next.js router pathname change dan fire 'pageview' event.
 *
 * Tidak track admin/portal routes by default — user behavior di
 * authenticated surface tidak relevan untuk PMF funnel (sudah convert).
 */
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { track } from '@/lib/analytics/track';

const EXCLUDED_PATTERNS = [
  /^\/admin/,
  /^\/portal/,
  /^\/api\//,
  /^\/_next\//,
];

function isTrackable(pathname: string): boolean {
  return !EXCLUDED_PATTERNS.some((re) => re.test(pathname));
}

export function PageviewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !isTrackable(pathname)) return;
    track('pageview', { path: pathname });
  }, [pathname]);

  return null;
}
