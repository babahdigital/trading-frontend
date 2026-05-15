'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useTier } from '@/lib/tiers/use-tier';
import { TIERS, tierAtLeast, type TierName } from '@/lib/tiers/tier-config';
import { TierBadge } from './tier-badge';
import { Lock } from 'lucide-react';

interface TierGateProps {
  /** Minimum tier yang dibutuhkan untuk akses children. */
  min: TierName;
  /** Children yang di-render kalau user tier >= min. */
  children: ReactNode;
  /** Optional custom fallback. Default = lock card dengan CTA upgrade. */
  fallback?: ReactNode;
  /** Lokal untuk copy fallback default. */
  locale?: 'id' | 'en';
}

/**
 * TierGate — wrapper component untuk feature gating berdasar tier.
 *
 * Behavior:
 *   - Loading: render skeleton ringan (cegah flicker hide → show)
 *   - User tier >= min: render children
 *   - User tier < min: render fallback (default = LockedFeature)
 *
 * Note: ini ADVISORY untuk UX, bukan security gate. Backend tetap authoritative
 * via require_min_tier middleware. Tujuan: hindari user lihat tombol/feature
 * yang akan return 403 kalau ditekan.
 */
export function TierGate({ min, children, fallback, locale = 'id' }: TierGateProps) {
  const { status, tier } = useTier();

  if (status === 'loading') {
    return <div className="rounded-md border border-border/60 bg-card/30 animate-pulse h-24" aria-busy="true" />;
  }

  if (tierAtLeast(tier, min)) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;

  return <LockedFeature min={min} userTier={tier} locale={locale} />;
}

function LockedFeature({ min, userTier, locale }: { min: TierName; userTier: TierName; locale: 'id' | 'en' }) {
  const minCfg = TIERS[min];
  const copy = locale === 'id'
    ? {
        title: `Fitur tier ${minCfg.name.toUpperCase()}+`,
        body: `Akun Anda saat ini di tier ${userTier}. Upgrade ke ${minCfg.name} untuk akses fitur ini.`,
        cta: 'Lihat upgrade',
      }
    : {
        title: `${minCfg.name.toUpperCase()}+ tier feature`,
        body: `Your account is currently on the ${userTier} tier. Upgrade to ${minCfg.name} to unlock this feature.`,
        cta: 'View upgrade',
      };
  return (
    <div className="rounded-lg border border-dashed border-border/80 bg-card/50 p-5 text-center">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mb-3">
        <Lock className="h-4 w-4" strokeWidth={2} aria-hidden />
      </div>
      <p className="text-sm font-medium text-foreground mb-1.5">{copy.title}</p>
      <p className="text-xs text-muted-foreground mb-3">{copy.body}</p>
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="text-[10px] text-muted-foreground">Required:</span>
        <TierBadge tier={min} size="sm" />
      </div>
      <Link href="/pricing" className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium">
        {copy.cta}
      </Link>
    </div>
  );
}
