'use client';

import { TradingToggle } from '@/components/portal/trading-toggle';

/**
 * Trading tab — surfaces the engines on/off toggle for the tenant.
 * Backend Sprint 11.4 P2 — PATCH /api/forex/me/engines.
 */
export function TradingTab() {
  return (
    <div className="space-y-6 max-w-2xl">
      <TradingToggle />
    </div>
  );
}

export default TradingTab;
