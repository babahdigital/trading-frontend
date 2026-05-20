'use client';

import { useEffect, useState, useCallback } from 'react';
import { ScrollText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { formatDate } from '@/lib/format-locale';
import { useAuth } from '@/lib/auth/auth-context';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  title_en: string | null;
  body: string;
  body_en: string | null;
  category: 'FEATURE' | 'IMPROVEMENT' | 'FIX' | 'SECURITY' | 'BREAKING';
  releasedAt: string;
  isPublished: boolean;
}

const EMPTY: ChangelogEntry = {
  id: '', version: '', title: '', title_en: null, body: '', body_en: null,
  category: 'FEATURE', releasedAt: new Date().toISOString().slice(0, 10), isPublished: false,
};

const CATEGORIES = ['FEATURE', 'IMPROVEMENT', 'FIX', 'SECURITY', 'BREAKING'] as const;

export default function CmsChangelogPage() {
  const { getAuthHeaders } = useAuth();
  const confirm = useConfirm();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [editing, setEditing] = useState<ChangelogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cms/changelog', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setEntries(await res.json());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!editing) return;
    const isNew = !editing.id;
    const url = isNew ? '/api/admin/cms/changelog' : `/api/admin/cms/changelog/${editing.id}`;
    const method = isNew ? 'POST' : 'PATCH';
    const res = await fetch(url, {
      method,
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    });
    if (!res.ok) {
      setError(`Save failed (${res.status})`);
      return;
    }
    setEditing(null);
    await load();
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: 'Hapus entri changelog?',
      description: 'Entri akan dihapus permanen.',
      confirmLabel: 'Hapus',
      tone: 'destructive',
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/cms/changelog/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (res.ok) await load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Changelog"
        description="Catatan rilis platform — dipublikasikan di /changelog"
        actions={
          <Button onClick={() => setEditing({ ...EMPTY })} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Entry
          </Button>
        }
      />

      {error && (
        <div role="alert" className="rounded-md bg-rose-500/10 border border-rose-500/30 p-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {loading ? 'Memuat…' : `${entries.length} entri`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-md bg-muted animate-pulse" />
            ))
          ) : entries.length === 0 ? (
            <EmptyState
              variant="inline"
              icon={ScrollText}
              title="Belum ada entri changelog"
              description="Catat rilis platform pertama Anda di sini."
              actions={[{ label: 'New Entry', onClick: () => setEditing({ ...EMPTY }), icon: Plus }]}
            />
          ) : entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 p-3 border border-border rounded-md">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm text-amber-600 dark:text-amber-400">v{e.version}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-foreground/5 border border-border">{e.category}</span>
                  {e.isPublished ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Published</span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-slate-500/15 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300">Draft</span>
                  )}
                </div>
                <p className="text-sm font-medium mt-1 truncate">{e.title}</p>
                <p className="text-xs text-muted-foreground">{formatDate(e.releasedAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(e)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => remove(e.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {editing.id ? `Edit v${editing.version}` : 'New Entry'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Version</label>
                <Input value={editing.version} onChange={(e) => setEditing({ ...editing, version: e.target.value })} placeholder="2.3.1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value as ChangelogEntry['category'] })}
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Released at</label>
                <Input type="date" value={editing.releasedAt.slice(0, 10)}
                  onChange={(e) => setEditing({ ...editing, releasedAt: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Title</label>
              <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Title (EN)</label>
              <Input value={editing.title_en ?? ''} onChange={(e) => setEditing({ ...editing, title_en: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Body (Markdown)</label>
              <Textarea value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} rows={10} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Body (EN)</label>
              <Textarea value={editing.body_en ?? ''} onChange={(e) => setEditing({ ...editing, body_en: e.target.value })} rows={6} />
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.isPublished}
                onChange={(e) => setEditing({ ...editing, isPublished: e.target.checked })} />
              Publish now
            </label>
            <div className="flex gap-2">
              <Button onClick={save}>Save</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
