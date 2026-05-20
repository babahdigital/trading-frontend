/**
 * Icon — wrapper untuk lucide-react dengan tone + size + container variants.
 *
 * Standar modern (2026): stroke 1.75 (sedikit ramping dari lucide default 2),
 * size token (xs/sm/md/lg/xl) yang aligned ke design system, dan tone-aware
 * coloring via semantic token.
 *
 * Anti-pattern yang digantikan:
 *   <UserIcon className="h-4 w-4 text-amber-400" strokeWidth={2.5} />  // inconsistent
 *
 * Pattern modern:
 *   <Icon icon={UserIcon} size="sm" tone="accent" />
 *
 * Bila perlu container (icon dalam badge bulat), pakai <IconCircle>.
 */
'use client';

import { ComponentProps, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type IconTone =
  | 'default'   // currentColor (inherits parent)
  | 'muted'    // text-muted-foreground
  | 'accent'   // brand amber
  | 'success'  // emerald
  | 'danger'   // rose
  | 'warning'  // amber-stronger
  | 'info';    // sky

const SIZE_CLASS: Record<IconSize, string> = {
  xs:  'h-3 w-3',
  sm:  'h-3.5 w-3.5',
  md:  'h-4 w-4',
  lg:  'h-5 w-5',
  xl:  'h-6 w-6',
  '2xl': 'h-8 w-8',
};

const TONE_CLASS: Record<IconTone, string> = {
  default: '',
  muted:   'text-muted-foreground',
  accent:  'text-amber-600 dark:text-amber-300',
  success: 'text-emerald-600 dark:text-emerald-400',
  danger:  'text-rose-600 dark:text-rose-400',
  warning: 'text-amber-700 dark:text-amber-300',
  info:    'text-sky-600 dark:text-sky-400',
};

export interface IconProps extends Omit<ComponentProps<LucideIcon>, 'size' | 'ref'> {
  icon: LucideIcon;
  size?: IconSize;
  tone?: IconTone;
  /** Default 1.75 (modern). Override if Lucide icon needs different weight. */
  strokeWidth?: number;
  /** Mark as decorative for screen readers. */
  ariaHidden?: boolean;
  /** Accessible name; renders <span class="sr-only">. */
  ariaLabel?: string;
}

export const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
  {
    icon: IconComp,
    size = 'md',
    tone = 'default',
    strokeWidth = 1.75,
    ariaHidden = true,
    ariaLabel,
    className,
    ...rest
  },
  ref,
) {
  return (
    <IconComp
      ref={ref}
      strokeWidth={strokeWidth}
      aria-hidden={ariaLabel ? undefined : ariaHidden}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
      className={cn(SIZE_CLASS[size], TONE_CLASS[tone], className)}
      {...rest}
    />
  );
});

/* ────────────────────────────────────────────────────────────────────────── */

const CONTAINER_SIZE: Record<IconSize, { box: string; inner: IconSize }> = {
  xs:  { box: 'h-6 w-6 rounded-md',   inner: 'xs' },
  sm:  { box: 'h-7 w-7 rounded-md',   inner: 'sm' },
  md:  { box: 'h-9 w-9 rounded-lg',   inner: 'md' },
  lg:  { box: 'h-11 w-11 rounded-lg', inner: 'lg' },
  xl:  { box: 'h-14 w-14 rounded-xl', inner: 'xl' },
  '2xl': { box: 'h-16 w-16 rounded-xl', inner: '2xl' },
};

const CONTAINER_TONE: Record<IconTone, string> = {
  default: 'bg-muted text-foreground',
  muted:   'bg-muted text-muted-foreground',
  accent:  'bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300 ring-1 ring-amber-500/20',
  success: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300 ring-1 ring-emerald-500/20',
  danger:  'bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300 ring-1 ring-rose-500/20',
  warning: 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 ring-1 ring-amber-500/20',
  info:    'bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300 ring-1 ring-sky-500/20',
};

export interface IconCircleProps {
  icon: LucideIcon;
  size?: IconSize;
  tone?: IconTone;
  strokeWidth?: number;
  ariaLabel?: string;
  className?: string;
}

/** Iconography inside a rounded container — replaces ad-hoc inline-flex divs
 *  with consistent ring + bg + size scaling. */
export function IconCircle({
  icon,
  size = 'md',
  tone = 'accent',
  strokeWidth = 1.75,
  ariaLabel,
  className,
}: IconCircleProps) {
  const cfg = CONTAINER_SIZE[size];
  return (
    <span
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
      className={cn(
        'inline-flex items-center justify-center shrink-0',
        cfg.box,
        CONTAINER_TONE[tone],
        className,
      )}
    >
      <Icon icon={icon} size={cfg.inner} strokeWidth={strokeWidth} />
    </span>
  );
}
