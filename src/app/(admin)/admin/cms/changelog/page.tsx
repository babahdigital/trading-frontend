'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CmsPageHeader } from '@/components/cms/page-header';
import { useAuth } from '@/lib/auth/auth-context';

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
    if (!confirm('Hapus entri ini?')) return;
    const res = await fetch(`/api/admin/cms/changelog/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (res.ok) await load();
  }

  return (
    <div className="space-y-6">
      <CmsPageHeader title="Changelog" description="Catatan rilis platform — dipublikasikan di /changelog" />

      {error && (
        <div role="alert" className="rounded-md bg-rose-500/10 border border-rose-500/30 p-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">
            {loading ? 'Loading…' : `${entries.length} entri`}
          </CardTitle>
          <Button onClick={() => setEditing({ ...EMPTY })}>+ New Entry</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 p-3 border border-border rounded-md">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-amber-400">v{e.version}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-foreground/5 border border-border">{e.category}</span>
                  {e.isPublished ? (
                    <span className="text-xs text-emerald-400">Published</span>
                  ) : (
                    <span className="text-xs text-foreground/50">Draft</span>
                  )}
                </div>
                <p className="text-sm font-medium mt-1 truncate">{e.title}</p>
                <p className="text-xs text-foreground/50">
                  {new Date(e.releasedAt).toLocaleDateString('id-ID')}
                </p>
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
