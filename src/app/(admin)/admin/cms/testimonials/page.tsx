'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CmsPageHeader } from '@/components/cms/page-header';
import { useAuth } from '@/lib/auth/auth-context';

interface TestimonialItem {
  id: string;
  name: string;
  role: string | null;
  content: string;
  rating: number;
  avatarUrl: string | null;
  isVisible: boolean;
  sortOrder: number;
}

export default function CmsTestimonialsPage() {
  const { getAuthHeaders } = useAuth();
  const [items, setItems] = useState<TestimonialItem[]>([]);
  const [editing, setEditing] = useState<TestimonialItem | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    const res = await fetch('/api/admin/cms/testimonials', { headers: getAuthHeaders() });
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, [getAuthHeaders]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  async function handleSave() {
    if (!editing) return;
    const method = editing.id ? 'PUT' : 'POST';
    await fetch('/api/admin/cms/testimonials', { method, headers: getAuthHeaders(), body: JSON.stringify(editing) });
    setEditing(null);
    fetchItems();
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus testimonial ini?')) return;
    await fetch(`/api/admin/cms/testimonials?id=${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    fetchItems();
  }

  const empty: TestimonialItem = { id: '', name: '', role: '', content: '', rating: 5, avatarUrl: '', isVisible: true, sortOrder: items.length };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <CmsPageHeader title="Testimonials" previewUrl="/" />
          <p className="text-muted-foreground">Kelola testimonial yang tampil di landing page.</p>
        </div>
        <Button onClick={() => setEditing(empty)}>+ Tambah Testimonial</Button>
      </div>

      {editing && (
        <Card>
          <CardHeader><CardTitle>{editing.id ? 'Edit Testimonial' : 'Tambah Testimonial'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1 block">Nama</label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Role / Kota</label><Input value={editing.role || ''} onChange={(e) => setEditing({ ...editing, role: e.target.value })} placeholder="Trader, Jakarta" /></div>
            </div>
            <div><label className="text-sm font-medium mb-1 block">Testimonial</label><Textarea value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} rows={4} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="text-sm font-medium mb-1 block">Rating (1-5)</label><Input type="number" min={1} max={5} value={editing.rating} onChange={(e) => setEditing({ ...editing, rating: parseInt(e.target.value) || 5 })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Avatar URL</label><Input value={editing.avatarUrl || ''} onChange={(e) => setEditing({ ...editing, avatarUrl: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Sort Order</label><Input type="number" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: parseInt(e.target.value) || 0 })} /></div>
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
          {items.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-semibold">{t.name}</span>
                  {t.role && <span className="text-sm text-muted-foreground ml-2">{t.role}</span>}
                  <span className="text-yellow-400 ml-2">{'★'.repeat(t.rating)}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(t)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(t.id)}>Hapus</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
