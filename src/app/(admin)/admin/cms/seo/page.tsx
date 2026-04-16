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
  description: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
}

export default function CmsSeoPage() {
  const { getAuthHeaders } = useAuth();
  const [pages, setPages] = useState<PageMetaItem[]>([]);
  const [editing, setEditing] = useState<PageMetaItem | null>(null);
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

  const empty: PageMetaItem = { id: '', path: '', title: '', description: '', ogTitle: '', ogDescription: '', ogImage: '' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <CmsPageHeader title="SEO / Page Meta" />
          <p className="text-muted-foreground">Kelola title, description, dan OG tags per halaman.</p>
        </div>
        <Button onClick={() => setEditing(empty)}>+ Tambah Page Meta</Button>
      </div>

      {editing && (
        <Card>
          <CardHeader><CardTitle>{editing.id ? 'Edit Page Meta' : 'Tambah Page Meta'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1 block">Path</label><Input value={editing.path} onChange={(e) => setEditing({ ...editing, path: e.target.value })} placeholder="/ atau /register" /></div>
              <div><label className="text-sm font-medium mb-1 block">Title</label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
            </div>
            <div><label className="text-sm font-medium mb-1 block">Description</label><Textarea value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1 block">OG Title</label><Input value={editing.ogTitle || ''} onChange={(e) => setEditing({ ...editing, ogTitle: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">OG Image URL</label><Input value={editing.ogImage || ''} onChange={(e) => setEditing({ ...editing, ogImage: e.target.value })} /></div>
            </div>
            <div><label className="text-sm font-medium mb-1 block">OG Description</label><Textarea value={editing.ogDescription || ''} onChange={(e) => setEditing({ ...editing, ogDescription: e.target.value })} rows={2} /></div>
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
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded mr-2">{p.path}</span>
                  <span className="font-semibold">{p.title}</span>
                </div>
                <div className="flex gap-2">
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
