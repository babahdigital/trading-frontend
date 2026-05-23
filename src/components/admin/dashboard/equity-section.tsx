'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, TrendingUp } from 'lucide-react';
import { EquityCurve } from '@/components/charts/equity-curve';
import { PnlBarChart } from '@/components/charts/pnl-bar-chart';
import { EmptyState } from '@/components/admin/empty-state';

export interface EquitySectionProps {
  equityData: { time: string; value: number }[];
  dailyPnl: { date: string; pnl: number }[];
  equityPeriod: string;
  onPeriodChange: (period: string) => void;
  loading: boolean;
  equityError?: string | null;
  pnlError?: string | null;
}

export function EquitySection({
  equityData,
  dailyPnl,
  equityPeriod,
  onPeriodChange,
  loading,
  equityError,
  pnlError,
}: EquitySectionProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3 min-w-0">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Master Equity Curve</CardTitle>
        </CardHeader>
        <CardContent>
          {equityError && (
            <div role="alert" className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-3 py-2 mb-3">
              {equityError}
            </div>
          )}
          <div className="w-full min-w-0">
            <EquityCurve
              data={equityData}
              height={360}
              periods={['7D', '30D', '90D', 'YTD']}
              activePeriod={equityPeriod}
              onPeriodChange={onPeriodChange}
            />
          </div>
          {equityData.length === 0 && !loading && (
            <EmptyState
              variant="inline"
              icon={Activity}
              title="Belum ada data equity"
              description="Hubungkan VPS backend untuk mulai mengalirkan snapshot equity."
              size="sm"
              className="mt-4"
            />
          )}
        </CardContent>
      </Card>
      <Card className="lg:col-span-2 min-w-0">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Daily PnL (30D)</CardTitle>
        </CardHeader>
        <CardContent>
          {pnlError && (
            <div role="alert" className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-3 py-2 mb-3">
              {pnlError}
            </div>
          )}
          {dailyPnl.length > 0 ? (
            <div className="w-full min-w-0">
              <PnlBarChart data={dailyPnl} height={360} />
            </div>
          ) : (
            <EmptyState
              variant="inline"
              icon={TrendingUp}
              title="Belum ada data PnL"
              size="sm"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
