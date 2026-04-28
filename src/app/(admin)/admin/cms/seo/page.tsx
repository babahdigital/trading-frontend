'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CmsPageHeader } from '@/components/cms/page-header';
import { useAuth } from '@/lib/auth/auth-context';

interface PageMetaItem {
  id: string;
  path: string;
  title: string;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  ogTitle: string | null;
  ogTitle_en: string | null;
  ogDescription: string | null;
  ogDescription_en: string | null;
  ogImage: string | null;
}

export default function CmsSeoPage() {
  const { getAuthHeaders } = useAuth();
  const [pages, setPages] = useState<PageMetaItem[]>([]);
  const [editing, setEditing] = useState<PageMetaItem | null>(null);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPages = useCallback(async () => {
    const res = await fetch('/api/admin/cms/seo', { headers: getAuthHeaders() });
    if (res.ok) setPages(await res.json());
    setLoading(false);
  }, [getAuthHeaders]);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  async function handleSave() {
    if (!editing) return;
    const method = editing.id ? 'PUT' : 'POST';
    await fetch('/api/admin/cms/seo', { method, headers: getAuthHeaders(), body: JSON.stringify(editing) });
    setEditing(null);
    fetchPages();
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus page meta ini?')) return;
    await fetch(`/api/admin/cms/seo?id=${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    fetchPages();
  }

  async function handleTranslateRow(id: string) {
    setTranslatingId(id);
    try {
      const res = await fetch('/api/admin/i18n/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ type: 'page-meta', id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`Auto-translate gagal: ${data.error ?? 'unknown'}`);
        return;
      }
      await fetchPages();
      if (editing?.id === id) {
        const updated = await fetch(`/api/admin/cms/seo`, { headers: getAuthHeaders() });
        if (updated.ok) {
          const all = await updated.json() as PageMetaItem[];
          const fresh = all.find((p) => p.id === id);
          if (fresh) setEditing(fresh);
        }
      }
    } catch (err) {
      alert(`Auto-translate error: ${String(err)}`);
    } finally {
      setTranslatingId(null);
    }
  }

  function hasEnglish(p: PageMetaItem): boolean {
    return Boolean(p.title_en && p.description_en);
  }

  const empty: PageMetaItem = {
    id: '', path: '', title: '', description: '', ogTitle: '', ogDescription: '', ogImage: '',
    title_en: null, description_en: null, ogTitle_en: null, ogDescription_en: null,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <CmsPageHeader title="SEO / Page Meta" />
          <p className="text-muted-foreground">
            Kelola title, description, dan OG tags per halaman. Tulis Indonesian sebagai source — worker zero-touch otomatis translate ke English dalam 5 menit, atau klik <strong>Auto-translate</strong> untuk instant.
          </p>
        </div>
        <Button onClick={() => setEditing(empty)}>+ Tambah Page Meta</Button>
      </div>

      {editing && (
        <Card>
          <CardHeader><CardTitle>{editing.id ? 'Edit Page Meta' : 'Tambah Page Meta'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1 block">Path</label><Input value={editing.path} onChange={(e) => setEditing({ ...editing, path: e.target.value })} placeholder="/ atau /register" /></div>
              <div><label className="text-sm font-medium mb-1 block">OG Image URL</label><Input value={editing.ogImage || ''} onChange={(e) => setEditing({ ...editing, ogImage: e.target.value })} /></div>
            </div>

            {/* Indonesian — Source of truth */}
            <div className="rounded-lg border border-border/60 p-4 space-y-3">
              <p className="text-xs font-mono uppercase tracking-wider text-amber-400">Bahasa Indonesia · Source of truth</p>
              <div><label className="text-sm font-medium mb-1 block">Title (ID)</label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Description (ID)</label><Textarea value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium mb-1 block">OG Title (ID)</label><Input value={editing.ogTitle || ''} onChange={(e) => setEditing({ ...editing, ogTitle: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">OG Description (ID)</label><Input value={editing.ogDescription || ''} onChange={(e) => setEditing({ ...editing, ogDescription: e.target.value })} /></div>
              </div>
            </div>

            {/* English — AI-generated, manually editable */}
            <div className="rounded-lg border border-border/60 p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-foreground/60">English · AI-generated, editable</p>
                  <p className="text-xs text-muted-foreground mt-1">Auto-translate worker isi setiap 5 menit, atau klik tombol untuk instant.</p>
                </div>
                {editing.id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleTranslateRow(editing.id)}
                    disabled={translatingId === editing.id}
                  >
                    {translatingId === editing.id ? 'Translating...' : '🌐 Auto-translate'}
                  </Button>
                )}
              </div>
              <div><label className="text-sm font-medium mb-1 block">Title (EN)</label><Input value={editing.title_en ?? ''} onChange={(e) => setEditing({ ...editing, title_en: e.target.value || null })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Description (EN)</label><Textarea value={editing.description_en ?? ''} onChange={(e) => setEditing({ ...editing, description_en: e.target.value || null })} rows={2} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium mb-1 block">OG Title (EN)</label><Input value={editing.ogTitle_en ?? ''} onChange={(e) => setEditing({ ...editing, ogTitle_en: e.target.value || null })} /></div>
                <div><label className="text-sm font-medium mb-1 block">OG Description (EN)</label><Input value={editing.ogDescription_en ?? ''} onChange={(e) => setEditing({ ...editing, ogDescription_en: e.target.value || null })} /></div>
              </div>
              {!editing.id && (
                <p className="text-xs text-amber-400">ⓘ Simpan dulu (Indonesian), lalu Auto-translate akan tersedia.</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSave}>Simpan</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : (
        <div className="space-y-3">
          {pages.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{p.path}</span>
                    {hasEnglish(p) ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">✓ EN</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300">⚠ Need EN</span>
                    )}
                  </div>
                  <span className="font-semibold truncate block">{p.title}</span>
                  {p.title_en && <span className="text-xs text-muted-foreground truncate block mt-0.5">EN: {p.title_en}</span>}
                </div>
                <div className="flex gap-2 shrink-0">
                  {!hasEnglish(p) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTranslateRow(p.id)}
                      disabled={translatingId === p.id}
                    >
                      {translatingId === p.id ? 'Translating...' : '🌐 Auto-translate'}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setEditing(p)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)}>Hapus</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
