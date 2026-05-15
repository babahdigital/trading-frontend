'use client';

import { cn } from '@/lib/utils';
import { TIERS, tierAccentClasses, type TierName } from '@/lib/tiers/tier-config';
import { Lock } from 'lucide-react';

interface TierBadgeProps {
  tier: TierName;
  /** Size variant — default 'sm' (chip), 'md' untuk hero card */
  size?: 'sm' | 'md';
  /** Tampilkan ikon lock kalau current user tidak punya akses */
  showLock?: boolean;
  className?: string;
}

const SIZE_CLASS = {
  sm: 'px-2.5 py-0.5 text-[10px]',
  md: 'px-3 py-1 text-xs',
} as const;

/**
 * TierBadge — display chip untuk tier dengan accent color konsisten.
 * Pakai di pricing card, capability ladder, dan setiap tempat yang sebut tier.
 */
export function TierBadge({ tier, size = 'sm', showLock, className }: TierBadgeProps) {
  const cfg = TIERS[tier];
  const accent = tierAccentClasses(cfg.accent);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-mono font-medium uppercase tracking-wider ring-1',
        SIZE_CLASS[size],
        accent.bg,
        accent.text,
        accent.ring,
        className,
      )}
    >
      {showLock ? <Lock className="h-3 w-3 opacity-70" strokeWidth={2.25} aria-hidden /> : null}
      {tier}
    </span>
  );
}
