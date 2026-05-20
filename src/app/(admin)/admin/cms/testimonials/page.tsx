'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ExternalLink, MessageSquareQuote, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { useAuth } from '@/lib/auth/auth-context';
import { useConfirm } from '@/components/ui/confirm-dialog';

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
  const confirm = useConfirm();
  const [items, setItems] = useState<TestimonialItem[]>([]);
  const [editing, setEditing] = useState<TestimonialItem | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    const res = await fetch('/api/admin/cms/testimonials', { headers: getAuthHeaders() });
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, [getAuthHeaders]);

  // fetchItems drives setState — intentional fetch on mount + refetch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchItems(); }, [fetchItems]);

  async function handleSave() {
    if (!editing) return;
    const method = editing.id ? 'PUT' : 'POST';
    await fetch('/api/admin/cms/testimonials', { method, headers: getAuthHeaders(), body: JSON.stringify(editing) });
    setEditing(null);
    fetchItems();
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Hapus testimonial?',
      description: 'Testimonial akan hilang dari landing page.',
      confirmLabel: 'Hapus',
      tone: 'destructive',
    });
    if (!ok) return;
    await fetch(`/api/admin/cms/testimonials?id=${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    fetchItems();
  }

  const empty: TestimonialItem = { id: '', name: '', role: '', content: '', rating: 5, avatarUrl: '', isVisible: true, sortOrder: items.length };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Testimonials"
        description="Kelola testimonial yang tampil di landing page."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/" target="_blank" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Preview
              </Link>
            </Button>
            <Button onClick={() => setEditing(empty)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Tambah Testimonial
            </Button>
          </>
        }
      />

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

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-6 w-full max-w-md rounded bg-muted animate-pulse" /></CardContent></Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={MessageSquareQuote}
          title="Belum ada testimonial"
          description="Tambahkan testimonial untuk membangun kepercayaan calon klien di landing page."
          actions={[{ label: 'Tambah Testimonial', onClick: () => setEditing(empty), icon: Plus }]}
        />
      ) : (
        <div className="space-y-3">
          {items.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{t.name}</span>
                  {t.role && <span className="text-sm text-muted-foreground">{t.role}</span>}
                  <span className="text-amber-500 dark:text-amber-400" aria-label={`Rating ${t.rating} dari 5`}>{'★'.repeat(t.rating)}</span>
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
