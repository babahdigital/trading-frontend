'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CmsPageHeader } from '@/components/cms/page-header';

interface BannerItem {
  id: string;
  title: string;
  content: string;
  linkUrl: string | null;
  linkLabel: string | null;
  position: string;
  bgColor: string | null;
  textColor: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('access_token')}`, 'Content-Type': 'application/json' };
}

export default function CmsBannersPage() {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [editing, setEditing] = useState<BannerItem | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBanners = useCallback(async () => {
    const res = await fetch('/api/admin/cms/banners', { headers: authHeaders() });
    if (res.ok) setBanners(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  async function handleSave() {
    if (!editing) return;
    const method = editing.id ? 'PUT' : 'POST';
    await fetch('/api/admin/cms/banners', { method, headers: authHeaders(), body: JSON.stringify(editing) });
    setEditing(null);
    fetchBanners();
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus banner ini?')) return;
    await fetch(`/api/admin/cms/banners?id=${id}`, { method: 'DELETE', headers: authHeaders() });
    fetchBanners();
  }

  const emptyBanner: BannerItem = { id: '', title: '', content: '', linkUrl: '', linkLabel: '', position: 'TOP', bgColor: '#0ea5e9', textColor: '#ffffff', isActive: true, startsAt: null, endsAt: null };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <CmsPageHeader title="Banner Manager" previewUrl="/" />
          <p className="text-muted-foreground">Kelola banner promosi di halaman publik.</p>
        </div>
        <Button onClick={() => setEditing(emptyBanner)}>+ Tambah Banner</Button>
      </div>

      {editing && (
        <Card>
          <CardHeader><CardTitle>{editing.id ? 'Edit Banner' : 'Tambah Banner'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><label className="text-sm font-medium mb-1 block">Title</label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
            <div><label className="text-sm font-medium mb-1 block">Content</label><Textarea value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Position</label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={editing.position} onChange={(e) => setEditing({ ...editing, position: e.target.value })}>
                  <option value="TOP">Top</option>
                  <option value="BOTTOM">Bottom</option>
                  <option value="FLOATING">Floating</option>
                </select>
              </div>
              <div><label className="text-sm font-medium mb-1 block">BG Color</label><Input type="color" value={editing.bgColor || '#0ea5e9'} onChange={(e) => setEditing({ ...editing, bgColor: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Text Color</label><Input type="color" value={editing.textColor || '#ffffff'} onChange={(e) => setEditing({ ...editing, textColor: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1 block">Link URL</label><Input value={editing.linkUrl || ''} onChange={(e) => setEditing({ ...editing, linkUrl: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Link Label</label><Input value={editing.linkLabel || ''} onChange={(e) => setEditing({ ...editing, linkLabel: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
                Active
              </label>
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
          {banners.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: b.bgColor || '#0ea5e9' }} />
                  <div>
                    <span className="font-semibold">{b.title}</span>
                    <span className="text-xs text-muted-foreground ml-2">{b.position} {b.isActive ? '' : '(inactive)'}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(b)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(b.id)}>Hapus</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
