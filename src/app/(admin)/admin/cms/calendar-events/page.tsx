'use client';

import { useEffect, useState, useCallback } from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { formatDate } from '@/lib/format-locale';

interface CalendarEvent {
  id: string;
  slug: string;
  templateKey: string;
  name: string;
  name_en: string | null;
  eventDate: string;
  leadDays: number;
  country: string;
  isActive: boolean;
  updatedAt: string;
  createdAt: string;
}

const emptyEvent: CalendarEvent = {
  id: '',
  slug: '',
  templateKey: '',
  name: '',
  name_en: null,
  eventDate: new Date().toISOString().split('T')[0],
  leadDays: 7,
  country: 'ID',
  isActive: true,
  updatedAt: '',
  createdAt: '',
};

export default function CmsCalendarEventsPage() {
  const { getAuthHeaders } = useAuth();
  const { push } = useToast();
  const confirm = useConfirm();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cms/calendar-events', { headers: getAuthHeaders() });
      if (res.ok) {
        setEvents(await res.json());
      } else {
        push({ title: 'Gagal memuat calendar events', description: `HTTP ${res.status}`, tone: 'error' });
      }
    } catch (err) {
      push({ title: 'Network error', description: err instanceof Error ? err.message : 'Unknown', tone: 'error' });
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, push]);

  // fetchEvents drives setState — intentional fetch on mount + refetch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const isNew = !editing.id;
      const method = isNew ? 'POST' : 'PATCH';
      const body = isNew
        ? {
            slug: editing.slug,
            templateKey: editing.templateKey,
            name: editing.name,
            name_en: editing.name_en || null,
            eventDate: editing.eventDate,
            leadDays: editing.leadDays,
            country: editing.country,
            isActive: editing.isActive,
          }
        : {
            id: editing.id,
            slug: editing.slug,
            templateKey: editing.templateKey,
            name: editing.name,
            name_en: editing.name_en || null,
            eventDate: editing.eventDate,
            leadDays: editing.leadDays,
            country: editing.country,
            isActive: editing.isActive,
          };

      const res = await fetch('/api/admin/cms/calendar-events', {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        push({ title: isNew ? 'Event dibuat' : 'Event diperbarui', tone: 'success' });
        setEditing(null);
        fetchEvents();
      } else {
        const data = await res.json().catch(() => ({}));
        push({ title: 'Gagal menyimpan event', description: data.error || `HTTP ${res.status}`, tone: 'error' });
      }
    } catch (err) {
      push({ title: 'Network error', description: err instanceof Error ? err.message : 'Unknown', tone: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Hapus calendar event?',
      description: 'Event akan dihapus permanen dan tidak bisa di-restore.',
      confirmLabel: 'Hapus event',
      tone: 'destructive',
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/cms/calendar-events?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        push({ title: 'Event dihapus', tone: 'success' });
        fetchEvents();
      } else {
        const data = await res.json().catch(() => ({}));
        push({ title: 'Gagal menghapus event', description: data.error || `HTTP ${res.status}`, tone: 'error' });
      }
    } catch (err) {
      push({ title: 'Network error', description: err instanceof Error ? err.message : 'Unknown', tone: 'error' });
    }
  }

  function handleToggleActive(event: CalendarEvent) {
    const updated = { ...event, isActive: !event.isActive };
    fetch('/api/admin/cms/calendar-events', {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id: event.id, isActive: updated.isActive }),
    })
      .then((res) => {
        if (res.ok) {
          push({ title: updated.isActive ? 'Event diaktifkan' : 'Event dinonaktifkan', tone: 'success' });
          fetchEvents();
        } else {
          push({ title: 'Gagal mengubah status', tone: 'error' });
        }
      })
      .catch(() => {
        push({ title: 'Network error', tone: 'error' });
      });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar Events"
        description="Kelola event kalender untuk promo & greeting. Digunakan oleh AI strategist."
        actions={
          <Button onClick={() => setEditing({ ...emptyEvent })} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Tambah Event
          </Button>
        }
      />

      {/* Edit / Create modal card */}
      {editing && (
        <Card className="card-enterprise">
          <CardHeader>
            <CardTitle>{editing.id ? 'Edit Event' : 'Tambah Event'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Slug</label>
                <Input
                  value={editing.slug}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  placeholder="lebaran-2026"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Template Key</label>
                <Input
                  value={editing.templateKey}
                  onChange={(e) => setEditing({ ...editing, templateKey: e.target.value })}
                  placeholder="lebaran, natal, tahun-baru"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Name (ID)</label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Hari Raya Idul Fitri"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Name (EN)</label>
                <Input
                  value={editing.name_en ?? ''}
                  onChange={(e) => setEditing({ ...editing, name_en: e.target.value || null })}
                  placeholder="Eid al-Fitr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Event Date</label>
                <Input
                  type="date"
                  value={editing.eventDate ? editing.eventDate.split('T')[0] : ''}
                  onChange={(e) => setEditing({ ...editing, eventDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Lead Days</label>
                <Input
                  type="number"
                  min={0}
                  value={editing.leadDays}
                  onChange={(e) => setEditing({ ...editing, leadDays: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Country</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={editing.country}
                  onChange={(e) => setEditing({ ...editing, country: e.target.value })}
                >
                  <option value="ID">ID (Indonesia)</option>
                  <option value="INTL">INTL (International)</option>
                  <option value="US">US</option>
                  <option value="MY">MY (Malaysia)</option>
                  <option value="SG">SG (Singapore)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={editing.isActive}
                onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-input accent-amber-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium">Active</label>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Batal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-10 rounded bg-muted animate-pulse" /></CardContent></Card>
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Belum ada calendar event"
          description="Tambahkan event pertama (Lebaran, Natal, Tahun Baru, dll) untuk AI strategist."
          actions={[{ label: 'Tambah Event', onClick: () => setEditing({ ...emptyEvent }), icon: Plus }]}
        />
      ) : (
        <Card className="card-enterprise">
          <CardContent className="p-0">
            <div className="md:overflow-x-auto">
              <table className="w-full text-sm table-responsive">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Template Key</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Event Date</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Lead Days</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Country</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Active</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id} className="border-b hover:bg-accent/50 transition-colors">
                      <td className="p-4" data-label="Name">
                        <div className="font-semibold">{ev.name}</div>
                        {ev.name_en && (
                          <div className="text-xs text-muted-foreground">EN: {ev.name_en}</div>
                        )}
                      </td>
                      <td className="p-4 font-mono text-xs" data-label="Template Key">{ev.templateKey}</td>
                      <td className="p-4 whitespace-nowrap" data-label="Event Date">{formatDate(ev.eventDate)}</td>
                      <td className="p-4 text-center tabular-nums" data-label="Lead Days">{ev.leadDays}</td>
                      <td className="p-4" data-label="Country">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
                          {ev.country}
                        </span>
                      </td>
                      <td className="p-4" data-label="Active">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(ev)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                            ev.isActive
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25'
                              : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500/25'
                          }`}
                        >
                          {ev.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="p-4 text-right" data-label="Actions">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => setEditing(ev)}>Edit</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(ev.id)}>Hapus</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
