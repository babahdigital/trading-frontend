/**
 * FilterBar — admin/portal search + filter chip primitive.
 *
 * Standar UI:
 *   <FilterBar
 *     search={search}
 *     onSearchChange={setSearch}
 *     searchPlaceholder="Cari nama, email…"
 *     filters={[
 *       { value: 'all', label: 'Semua' },
 *       { value: 'ACTIVE', label: 'Aktif' },
 *     ]}
 *     activeFilter={filter}
 *     onFilterChange={setFilter}
 *   />
 *
 * Mobile: search full-width, chips horizontal-scroll. Desktop: search 256-320px,
 * chips inline. Search input punya debounce internal via onSearchChange (caller
 * harus implement debounce).
 */
'use client';

import { ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FilterOption<T = string> {
  value: T;
  label: string;
  /** Optional count badge */
  count?: number;
}

export interface FilterBarProps<T extends string = string> {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  /** Hide search if not needed */
  searchVisible?: boolean;

  filters?: FilterOption<T>[];
  activeFilter?: T;
  onFilterChange?: (v: T) => void;

  /** Optional right-side actions (e.g. export button, view toggle) */
  actions?: ReactNode;
  /** Optional left-side extra (e.g. period picker) */
  leading?: ReactNode;

  className?: string;
}

export function FilterBar<T extends string = string>({
  search,
  onSearchChange,
  searchPlaceholder = 'Cari…',
  searchVisible = true,
  filters,
  activeFilter,
  onFilterChange,
  actions,
  leading,
  className,
}: FilterBarProps<T>) {
  const showFilters = filters && filters.length > 0;
  const showSearch = searchVisible && onSearchChange !== undefined;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 sm:gap-3',
        className,
      )}
    >
      {leading ? <div className="shrink-0">{leading}</div> : null}

      {showFilters ? (
        <div
          role="tablist"
          aria-label="Filter"
          className="flex items-center gap-1 overflow-x-auto no-scrollbar -mx-1 px-1 min-w-0"
        >
          {filters!.map((f) => {
            const active = f.value === activeFilter;
            return (
              <Button
                key={String(f.value)}
                role="tab"
                aria-selected={active}
                variant={active ? 'default' : 'outline'}
                size="sm"
                onClick={() => onFilterChange?.(f.value)}
                className="shrink-0"
              >
                {f.label}
                {typeof f.count === 'number' ? (
                  <span className={cn(
                    'ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded-full text-[10px] font-semibold',
                    active
                      ? 'bg-background/30 text-current'
                      : 'bg-muted text-muted-foreground',
                  )}>
                    {f.count}
                  </span>
                ) : null}
              </Button>
            );
          })}
        </div>
      ) : null}

      {showSearch ? (
        <div className="relative flex-1 min-w-[160px] sm:max-w-[280px] order-first sm:order-none w-full sm:w-auto">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder={searchPlaceholder}
            value={search ?? ''}
            onChange={(e) => onSearchChange!(e.target.value)}
            className="pl-9 pr-9 bg-background h-9"
            aria-label={searchPlaceholder}
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange!('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Bersihkan pencarian"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}

      {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
