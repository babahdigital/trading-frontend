'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CmsPageHeader } from '@/components/cms/page-header';
import { ReorderButtons } from '@/components/cms/reorder-buttons';

interface LandingSection {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  content: Record<string, unknown>;
  sortOrder: number;
  isVisible: boolean;
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('access_token')}`, 'Content-Type': 'application/json' };
}

export default function CmsLandingPage() {
  const [sections, setSections] = useState<LandingSection[]>([]);
  const [editing, setEditing] = useState<LandingSection | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSections = useCallback(async () => {
    const res = await fetch('/api/admin/cms/landing-sections', { headers: authHeaders() });
    if (res.ok) setSections(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchSections(); }, [fetchSections]);

  async function handleSave() {
    if (!editing) return;
    const method = editing.id ? 'PUT' : 'POST';
    await fetch('/api/admin/cms/landing-sections', {
      method,
      headers: authHeaders(),
      body: JSON.stringify(editing),
    });
    setEditing(null);
    fetchSections();
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus section ini?')) return;
    await fetch(`/api/admin/cms/landing-sections?id=${id}`, { method: 'DELETE', headers: authHeaders() });
    fetchSections();
  }

  async function handleReorder(index: number, direction: 'up' | 'down') {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sections.length) return;
    const a = sections[index];
    const b = sections[swapIndex];
    await Promise.all([
      fetch('/api/admin/cms/landing-sections', { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ id: a.id, sortOrder: b.sortOrder }) }),
      fetch('/api/admin/cms/landing-sections', { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ id: b.id, sortOrder: a.sortOrder }) }),
    ]);
    fetchSections();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <CmsPageHeader title="Landing Page Editor" previewUrl="/" />
          <p className="text-muted-foreground">Kelola section-section pada halaman landing.</p>
        </div>
        <Button onClick={() => setEditing({ id: '', slug: '', title: '', subtitle: '', content: {}, sortOrder: sections.length, isVisible: true })}>
          + Tambah Section
        </Button>
      </div>

      {editing && (
        <Card>
          <CardHeader><CardTitle>{editing.id ? 'Edit Section' : 'Tambah Section'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Slug</label>
                <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="hero, features, pricing..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Sort Order</label>
                <Input type="number" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
              <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Subtitle</label>
              <Input value={editing.subtitle || ''} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Content (JSON)</label>
              <Textarea
                value={JSON.stringify(editing.content, null, 2)}
                onChange={(e) => { try { setEditing({ ...editing, content: JSON.parse(e.target.value) }); } catch {} }}
                rows={6}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.isVisible} onChange={(e) => setEditing({ ...editing, isVisible: e.target.checked })} />
                Visible
              </label>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSave}>Simpan</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : sections.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Belum ada section. Klik &quot;+ Tambah Section&quot; untuk memulai.</div>
      ) : (
        <div className="space-y-3">
          {sections.map((s, i) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ReorderButtons
                    index={i}
                    total={sections.length}
                    onMoveUp={() => handleReorder(i, 'up')}
                    onMoveDown={() => handleReorder(i, 'down')}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{s.slug}</span>
                      <span className="font-semibold">{s.title}</span>
                      {!s.isVisible && <span className="text-xs text-muted-foreground">(hidden)</span>}
                    </div>
                    {s.subtitle && <p className="text-sm text-muted-foreground">{s.subtitle}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(s)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(s.id)}>Hapus</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
