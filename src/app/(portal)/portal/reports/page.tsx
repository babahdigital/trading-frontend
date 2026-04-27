'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';

interface ReportData {
  summary?: string;
  trades_count?: number;
  total_pnl?: number;
  [key: string]: unknown;
}

export default function ReportsPage() {
  const t = useTranslations('portal.reports');
  const tShared = useTranslations('portal.shared');
  const { getAuthHeaders } = useAuth();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch('/api/client/reports', { headers: getAuthHeaders() });
        if (!res.ok) throw new Error(t('fetch_failed'));
        const data = await res.json();
        setReport(data);
        setError('');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : tShared('connection_error'));
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function renderValue(value: unknown): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }

  const highlightKeys = ['summary', 'trades_count', 'total_pnl'];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground text-sm">{t('loading')}</p>
      ) : !report ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">{t('no_report')}</p>
        </div>
      ) : (
        <>
          {/* Highlighted Metrics */}
          {(report.summary || report.trades_count !== undefined || report.total_pnl !== undefined) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {report.summary && (
                <Card className="bg-card border-border md:col-span-3">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t('summary')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground whitespace-pre-wrap">{report.summary}</p>
                  </CardContent>
                </Card>
              )}

              {report.trades_count !== undefined && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t('total_trades')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-foreground">{report.trades_count}</p>
                  </CardContent>
                </Card>
              )}

              {report.total_pnl !== undefined && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t('total_pnl')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p
                      className={cn(
                        'text-2xl font-bold',
                        (report.total_pnl as number) >= 0 ? 'text-green-400' : 'text-red-400'
                      )}
                    >
                      {(report.total_pnl as number) >= 0 ? '+' : ''}$
                      {(report.total_pnl as number).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Full Report Details */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">{t('details_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(report)
                  .filter(([key]) => !highlightKeys.includes(key))
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-start justify-between py-2 border-b border-border/50 last:border-0"
                    >
                      <span className="text-sm font-medium text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm text-foreground text-right max-w-[60%] whitespace-pre-wrap">
                        {renderValue(value)}
                      </span>
                    </div>
                  ))}
                {Object.entries(report).filter(([key]) => !highlightKeys.includes(key)).length ===
                  0 && (
                  <p className="text-muted-foreground text-sm">{t('no_details')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
