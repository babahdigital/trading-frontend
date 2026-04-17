'use client';

import { useEffect, useState } from 'react';
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

function getCurrentSessions(): { name: string; status: 'active' | 'opening' | 'closed' }[] {
  const utcHour = new Date().getUTCHours();
  return [
    { name: 'Asian', status: (utcHour >= 0 && utcHour < 9) ? 'active' : 'closed' },
    { name: 'London', status: (utcHour >= 7 && utcHour < 16) ? 'active' : (utcHour >= 6 && utcHour < 7) ? 'opening' : 'closed' },
    { name: 'New York', status: (utcHour >= 13 && utcHour < 22) ? 'active' : (utcHour >= 12 && utcHour < 13) ? 'opening' : 'closed' },
  ];
}

function sessionDot(status: string) {
  if (status === 'active') return 'bg-green-400';
  if (status === 'opening') return 'bg-yellow-400';
  return 'bg-slate-500';
}

export default function MarketPage() {
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
        if (!res.ok) throw new Error('Failed to fetch scanner data');
        const data = await res.json();
        if (active) {
          setItems(Array.isArray(data) ? data : data.pairs || data.items || []);
          setLastUpdated(new Date());
          setError('');
        }
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : 'Connection error');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kondisi Pasar</h1>
        {lastUpdated && (
          <span className="text-xs text-muted-foreground">
            Updated: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* ROW 1: Session Status Bar */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-6 flex-wrap">
            {sessions.map((s) => (
              <div key={s.name} className="flex items-center gap-2">
                <span className={cn('w-2.5 h-2.5 rounded-full', sessionDot(s.status))} />
                <span className="text-sm font-medium">{s.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{s.status === 'active' ? 'Active' : s.status === 'opening' ? 'Opening Soon' : 'Closed'}</span>
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
        <p className="text-muted-foreground text-sm">Loading scanner...</p>
      ) : heatmapPairs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No scanner data available</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">14 Instrumen</CardTitle>
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
            <CardTitle className="text-sm font-medium">Berita High-Impact (24 Jam)</CardTitle>
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
                    <span>Currency: {event.currency}</span>
                    {event.forecast && <span className="ml-3">Forecast: {event.forecast}</span>}
                    {event.previous && <span className="ml-3">Prev: {event.previous}</span>}
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
                <p className="text-muted-foreground text-sm text-center py-4">Tidak ada berita high-impact dalam 24 jam ke depan</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
