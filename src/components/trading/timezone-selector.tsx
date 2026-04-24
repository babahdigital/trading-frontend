'use client';

import { useEffect, useMemo, useState } from 'react';
import { Globe2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  COMMON_TIMEZONES,
  detectBrowserTimezone,
  getStoredTimezone,
  setStoredTimezone,
} from '@/lib/timezone/util';

/**
 * Timezone selector per FRONTEND_DEVELOPMENT_GUIDE §4.5.
 *
 * Persists user choice to localStorage; `apiFetch` automatically picks
 * it up as Accept-Timezone on subsequent requests.
 *
 * Optional `onChange` callback so parent containers can PATCH the
 * user profile server-side (via /api/client/profile) for cross-device
 * preference.
 */
export interface TimezoneSelectorProps {
  value?: string;
  onChange?: (tz: string) => void;
  className?: string;
  label?: string;
  compact?: boolean;
}

export function TimezoneSelector({
  value,
  onChange,
  className,
  label,
  compact = false,
}: TimezoneSelectorProps) {
  const [current, setCurrent] = useState<string>(value ?? detectBrowserTimezone());

  useEffect(() => {
    if (value) {
      setCurrent(value);
      return;
    }
    const stored = getStoredTimezone();
    if (stored) setCurrent(stored);
    else setCurrent(detectBrowserTimezone());
  }, [value]);

  const options = useMemo(() => {
    const set = new Set<string>(COMMON_TIMEZONES);
    if (current && !set.has(current)) set.add(current);
    return Array.from(set);
  }, [current]);

  function handleChange(next: string) {
    setCurrent(next);
    setStoredTimezone(next);
    onChange?.(next);
  }

  return (
    <label className={cn('inline-flex items-center gap-2 text-sm', compact && 'text-xs', className)}>
      <Globe2 className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} aria-hidden />
      {label && <span className="text-muted-foreground">{label}</span>}
      <select
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        className={cn(
          'rounded-md border border-border bg-background px-2 py-1 text-sm',
          compact && 'px-1.5 py-0.5 text-xs',
        )}
        aria-label="Select timezone"
      >
        {options.map((tz) => (
          <option key={tz} value={tz}>
            {tz}
          </option>
        ))}
      </select>
    </label>
  );
}
