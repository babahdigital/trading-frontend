'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ScannerHeatmap } from '@/components/charts/scanner-heatmap';
import { useAuth } from '@/lib/auth/auth-context';

interface ScannerItem {
  pair: string;
  status_label?: string;
  total_score?: number;
  spread?: number;
}

interface NewsEvent {
  time: string;
  title: string;
  currency: string;
  impact: string;
  forecast?: string;
  previous?: string;
  affected_pairs?: string[];
}

interface SessionInfo {
  nameKey: string;
  status: 'active' | 'opening' | 'closed';
}

function getCurrentSessions(): SessionInfo[] {
  const utcHour = new Date().getUTCHours();
  return [
    { nameKey: 'session_asian', status: (utcHour >= 0 && utcHour < 9) ? 'active' : 'closed' },
    { nameKey: 'session_london', status: (utcHour >= 7 && utcHour < 16) ? 'active' : (utcHour >= 6 && utcHour < 7) ? 'opening' : 'closed' },
    { nameKey: 'session_new_york', status: (utcHour >= 13 && utcHour < 22) ? 'active' : (utcHour >= 12 && utcHour < 13) ? 'opening' : 'closed' },
  ];
}

function sessionDot(status: string) {
  if (status === 'active') return 'bg-green-400';
  if (status === 'opening') return 'bg-yellow-400';
  return 'bg-slate-500';
}

export default function MarketPage() {
  const t = useTranslations('portal.market');
  const tShared = useTranslations('portal.shared');
  const { getAuthHeaders } = useAuth();
  const [items, setItems] = useState<ScannerItem[]>([]);
  const [news, setNews] = useState<NewsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const sessions = getCurrentSessions();

  useEffect(() => {
    let active = true;

    async function fetchScanner() {
      try {
        const res = await fetch('/api/client/scanner', { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('scanner_failed');
        const data = await res.json();
        if (active) {
          setItems(Array.isArray(data) ? data : data.pairs || data.items || []);
          setLastUpdated(new Date());
          setError('');
        }
      } catch (err: unknown) {
        if (active) setError(err instanceof Error && err.message !== 'scanner_failed' ? err.message : tShared('connection_error'));
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchScanner();
    const interval = setInterval(fetchScanner, 30000);
    return () => { active = false; clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch calendar/news events
  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch('/api/client/calendar', { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setNews(Array.isArray(data) ? data : data.events || []);
        }
      } catch { /* handled */ }
    }
    fetchNews();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Map scanner items to heatmap format
  const heatmapPairs = items.map((item) => ({
    pair: item.pair,
    score: (item.total_score || 0) / 100,
    status: (item.status_label?.toUpperCase() === 'AKTIF' ? 'active' : item.status_label?.toUpperCase() === 'STANDBY' ? 'standby' : 'off') as 'active' | 'standby' | 'off',
  }));

  function sessionStatusLabel(status: string) {
    if (status === 'active') return t('session_active');
    if (status === 'opening') return t('session_opening_soon');
    return t('session_closed');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        {lastUpdated && (
          <span className="text-xs text-muted-foreground">
            {tShared('updated_at')}: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* ROW 1: Session Status Bar */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-6 flex-wrap">
            {sessions.map((s) => (
              <div key={s.nameKey} className="flex items-center gap-2">
                <span className={cn('w-2.5 h-2.5 rounded-full', sessionDot(s.status))} />
                <span className="text-sm font-medium">{t(s.nameKey)}</span>
                <span className="text-xs text-muted-foreground">{sessionStatusLabel(s.status)}</span>
              </div>
            ))}
            <span className="ml-auto text-xs text-muted-foreground font-mono">
              {new Date().toUTCString().slice(17, 25)} UTC
            </span>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{error}</div>
      )}

      {/* ROW 2: Pair Grid (Client view - simplified) */}
      {loading ? (
        <p className="text-muted-foreground text-sm">{t('loading_scanner')}</p>
      ) : heatmapPairs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{t('no_scanner_data')}</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('instruments_title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScannerHeatmap pairs={heatmapPairs} mode="client" />
          </CardContent>
        </Card>
      )}

      {/* ROW 3: Upcoming High-Impact Events */}
      {news.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('high_impact_news_title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {news.filter((n) => n.impact === 'high').slice(0, 5).map((event, i) => (
                <div key={i} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="font-semibold text-sm">{event.title}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{event.time}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span>{t('currency_label')} {event.currency}</span>
                    {event.forecast && <span className="ml-3">{t('forecast_label')} {event.forecast}</span>}
                    {event.previous && <span className="ml-3">{t('previous_label')} {event.previous}</span>}
                  </div>
                  {event.affected_pairs && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {event.affected_pairs.map((p) => (
                        <span key={p} className="px-1.5 py-0.5 bg-secondary rounded text-[10px] font-mono">{p}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {news.filter((n) => n.impact === 'high').length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">{t('no_high_impact')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
