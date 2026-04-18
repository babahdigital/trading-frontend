'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';

const CHANNELS = [
  { id: 'INAPP', label: 'In-App' },
  { id: 'EMAIL', label: 'Email' },
  { id: 'TELEGRAM', label: 'Telegram' },
  { id: 'WHATSAPP', label: 'WhatsApp' },
] as const;

interface Preference {
  channels: string[];
  minConfidence: string | null;
  language: string;
  timezone: string;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

interface LogEntry {
  id: string;
  channel: string;
  category: string;
  status: string;
  createdAt: string;
  deliveredAt: string | null;
  errorMessage: string | null;
}

export function NotificationsTab() {
  const { getAuthHeaders } = useAuth();
  const [pref, setPref] = useState<Preference | null>(null);
  const [recent, setRecent] = useState<LogEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/client/notifications', { headers: getAuthHeaders() })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setPref(data.preference);
          setRecent(data.recent ?? []);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleChannel(id: string) {
    if (!pref) return;
    const next = pref.channels.includes(id)
      ? pref.channels.filter((c) => c !== id)
      : [...pref.channels, id];
    setPref({ ...pref, channels: next });
  }

  async function save() {
    if (!pref) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/client/notifications', {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(pref),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setMessage('Preferensi tersimpan.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  if (!pref) return <p className="text-muted-foreground">Memuat…</p>;

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-lg font-semibold">Preferensi Notifikasi</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-sm mb-2">Channel yang aktif</p>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((c) => {
                const active = pref.channels.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleChannel(c.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60',
                      active
                        ? 'border-amber-400 bg-amber-400/10 text-amber-400'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    )}
                    aria-pressed={active}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="conf" className="text-xs text-muted-foreground mb-1 block">Minimum confidence</label>
              <Input id="conf" type="number" step="0.01" min="0" max="1"
                value={pref.minConfidence ?? ''}
                onChange={(e) => setPref({ ...pref, minConfidence: e.target.value })} placeholder="0.70" />
            </div>
            <div>
              <label htmlFor="lang" className="text-xs text-muted-foreground mb-1 block">Bahasa</label>
              <select id="lang" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={pref.language}
                onChange={(e) => setPref({ ...pref, language: e.target.value })}>
                <option value="id">Indonesia</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label htmlFor="tz" className="text-xs text-muted-foreground mb-1 block">Timezone</label>
              <Input id="tz" value={pref.timezone}
                onChange={(e) => setPref({ ...pref, timezone: e.target.value })} placeholder="Asia/Jakarta" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="qhs" className="text-xs text-muted-foreground mb-1 block">Quiet hours start</label>
              <Input id="qhs" type="time" value={pref.quietHoursStart ?? ''}
                onChange={(e) => setPref({ ...pref, quietHoursStart: e.target.value || null })} />
            </div>
            <div>
              <label htmlFor="qhe" className="text-xs text-muted-foreground mb-1 block">Quiet hours end</label>
              <Input id="qhe" type="time" value={pref.quietHoursEnd ?? ''}
                onChange={(e) => setPref({ ...pref, quietHoursEnd: e.target.value || null })} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
            {message && <span className="text-sm text-muted-foreground">{message}</span>}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-lg font-semibold">Riwayat Pengiriman</CardTitle></CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada notifikasi terkirim.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b border-border/50">
                  <tr>
                    <th className="text-left py-2 px-2">Waktu</th>
                    <th className="text-left py-2 px-2">Channel</th>
                    <th className="text-left py-2 px-2">Kategori</th>
                    <th className="text-left py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((l) => (
                    <tr key={l.id} className="border-b border-border/30">
                      <td className="py-2 px-2 text-muted-foreground">
                        {new Date(l.createdAt).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2 px-2">{l.channel}</td>
                      <td className="py-2 px-2">{l.category}</td>
                      <td className={cn('py-2 px-2',
                        l.status === 'SENT' ? 'text-emerald-400' :
                        l.status === 'FAILED' ? 'text-rose-400' : 'text-muted-foreground')}>
                        {l.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
