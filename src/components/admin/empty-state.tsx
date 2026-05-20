/**
 * EmptyState — institutional empty-data primitive.
 *
 * Pakai untuk semua admin/portal page yang tampilkan list/table/grid
 * agar konsisten: icon visual + judul + deskripsi + opsi CTA.
 *
 * Anti-pattern yang digantikan: `<div className="text-muted-foreground">No data</div>`
 * yang tampil polos tanpa konteks/CTA.
 *
 * Variants:
 *   - `default`  : card bordered (default, untuk dalam Card body)
 *   - `inline`   : tanpa border (untuk dalam Card yang sudah punya frame)
 *   - `error`    : tone destructive untuk error state
 *
 * Size:
 *   - `sm` : compact 8px padding (table row, small list)
 *   - `md` : default
 *   - `lg` : large hero empty (full-page kosong)
 */
'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Inbox, AlertCircle, type LucideIcon } from 'lucide-react';

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  icon?: LucideIcon;
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actions?: EmptyStateAction[];
  variant?: 'default' | 'inline' | 'error';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Optional secondary slot (e.g. small chip, status, code snippet) */
  meta?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  actions = [],
  variant = 'default',
  size = 'md',
  className,
  meta,
}: EmptyStateProps) {
  const Icon = icon || (variant === 'error' ? AlertCircle : Inbox);
  const iconSize = size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8';
  const iconWrap = size === 'sm' ? 'h-10 w-10' : size === 'lg' ? 'h-16 w-16' : 'h-12 w-12';
  const titleSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base';
  const descSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const padding = size === 'sm' ? 'py-6 px-4' : size === 'lg' ? 'py-16 px-6' : 'py-10 px-4';

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        padding,
        variant === 'default' && 'rounded-lg border border-dashed border-border bg-muted/30',
        variant === 'error' && 'rounded-lg border border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10',
        className,
      )}
    >
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-full mb-3',
          iconWrap,
          variant === 'error'
            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300'
            : 'bg-muted text-muted-foreground',
        )}
        aria-hidden="true"
      >
        <Icon className={iconSize} strokeWidth={1.75} />
      </div>
      <h3 className={cn('font-semibold text-foreground', titleSize)}>{title}</h3>
      {description ? (
        <p className={cn('mt-1 max-w-md text-muted-foreground', descSize)}>{description}</p>
      ) : null}
      {meta ? <div className="mt-3">{meta}</div> : null}
      {actions.length > 0 ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {actions.map((a, i) => {
            const ActionIcon = a.icon;
            const inner = (
              <>
                {ActionIcon ? <ActionIcon className="h-4 w-4 mr-1.5" /> : null}
                {a.label}
              </>
            );
            if (a.href) {
              return (
                <Button key={i} asChild variant={a.variant ?? (i === 0 ? 'default' : 'outline')} size="sm">
                  <Link href={a.href}>{inner}</Link>
                </Button>
              );
            }
            return (
              <Button
                key={i}
                onClick={a.onClick}
                variant={a.variant ?? (i === 0 ? 'default' : 'outline')}
                size="sm"
                type="button"
              >
                {inner}
              </Button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
