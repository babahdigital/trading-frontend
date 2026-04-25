'use client';

/**
 * Account type badge — DEMO_UX_GUIDE §3.1 compliance.
 *
 * Renders LIVE / DEMO badge with mandatory wording:
 *   - DEMO badge MUST say "DEMO — simulated" (en) or "DEMO — simulasi" (id)
 *   - LIVE badge: just "LIVE"
 *   - Color: orange (#F59E0B) for demo, green (#10B981) for live
 *   - NEVER use red (reserved for kill-switch / margin-call)
 */

import { useLocale } from 'next-intl';

export type AccountType = 'demo' | 'live';

interface Props {
  type: AccountType;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<Props['size']>, string> = {
  xs: 'text-[10px] px-1.5 py-0.5',
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
};

export function AccountTypeBadge({ type, size = 'sm', className = '' }: Props) {
  const locale = useLocale();
  const isLive = type === 'live';

  const label = isLive
    ? 'LIVE'
    : locale === 'id'
      ? 'DEMO — simulasi'
      : 'DEMO — simulated';

  const tone = isLive
    ? 'bg-green-500/15 text-green-400 border-green-500/30'
    : 'bg-amber-500/15 text-amber-400 border-amber-500/40';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-mono uppercase tracking-wider border ${SIZE_CLASS[size]} ${tone} ${className}`}
      data-testid={`account-type-${type}`}
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-400' : 'bg-amber-400'}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

/**
 * Equity number formatter that adds (simulated) / (simulasi) suffix for demo.
 * Use whenever rendering a numeric equity/balance/PnL where the account
 * context is demo, per DEMO_UX_GUIDE §3.1.
 */
export function formatDemoEquity(value: number, accountType: AccountType, locale: string): string {
  const fmt = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (accountType === 'demo') {
    const suffix = locale === 'id' ? '(simulasi)' : '(simulated)';
    return `${fmt} ${suffix}`;
  }
  return fmt;
}
