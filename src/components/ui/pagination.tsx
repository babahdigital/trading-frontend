'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Numbered pagination component for grid content lists.
 *
 * Displays: « Prev | 1 2 … 4 [5] 6 … 10 | Next »
 *
 * Truncation rules keep max 7 visible number buttons:
 *   - Always show first + last
 *   - Always show current ± 1
 *   - Insert ellipsis between non-adjacent ranges
 *
 * Controlled — parent owns `page` state. Disabled state auto-handled
 * on Prev/Next when at boundaries.
 */
export interface PaginationProps {
  /** Current page (1-indexed) */
  page: number;
  /** Total items across all pages */
  total: number;
  /** Items per page */
  perPage: number;
  /** Called on user click — parent updates state */
  onPageChange: (nextPage: number) => void;
  /** Accessible labels (for i18n) */
  labels?: {
    prev?: string;
    next?: string;
    page?: string;
    of?: string;
  };
  /** Extra className on wrapper */
  className?: string;
}

type PageItem = number | 'ellipsis-left' | 'ellipsis-right';

function buildPageList(current: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: PageItem[] = [1];

  if (current > 3) pages.push('ellipsis-left');

  const startRange = Math.max(2, current - 1);
  const endRange = Math.min(totalPages - 1, current + 1);
  for (let i = startRange; i <= endRange; i += 1) {
    pages.push(i);
  }

  if (current < totalPages - 2) pages.push('ellipsis-right');

  pages.push(totalPages);
  return pages;
}

export function Pagination({ page, total, perPage, onPageChange, labels = {}, className }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const items = useMemo(() => buildPageList(page, totalPages), [page, totalPages]);
  const { prev = 'Prev', next = 'Next', page: pageLabel = 'Page', of = 'of' } = labels;

  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-center gap-1.5 flex-wrap py-8', className)}
    >
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        aria-label={prev}
        className={cn(
          'inline-flex items-center gap-1 px-3 py-2 rounded-md border text-xs font-mono transition-colors',
          page <= 1
            ? 'border-white/[0.05] text-foreground/25 cursor-not-allowed'
            : 'border-white/10 text-foreground/70 hover:border-amber-500/30 hover:text-amber-400',
        )}
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">{prev}</span>
      </button>

      {items.map((item, idx) => {
        if (item === 'ellipsis-left' || item === 'ellipsis-right') {
          return (
            <span
              key={`${item}-${idx}`}
              className="px-2 py-2 text-foreground/40 text-xs font-mono select-none"
              aria-hidden
            >
              …
            </span>
          );
        }
        const isActive = item === page;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-label={`${pageLabel} ${item} ${of} ${totalPages}`}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'min-w-[2.25rem] px-2.5 py-2 rounded-md border text-xs font-mono transition-colors',
              isActive
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-400 font-semibold'
                : 'border-white/10 text-foreground/70 hover:border-amber-500/30 hover:text-amber-400',
            )}
          >
            {item}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        aria-label={next}
        className={cn(
          'inline-flex items-center gap-1 px-3 py-2 rounded-md border text-xs font-mono transition-colors',
          page >= totalPages
            ? 'border-white/[0.05] text-foreground/25 cursor-not-allowed'
            : 'border-white/10 text-foreground/70 hover:border-amber-500/30 hover:text-amber-400',
        )}
      >
        <span className="hidden sm:inline">{next}</span>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </button>
    </nav>
  );
}
