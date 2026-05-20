'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ExternalLink, LayoutGrid, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { ReorderButtons } from '@/components/cms/reorder-buttons';
import { GenerateEnglishButton } from '@/components/cms/generate-english-button';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface LandingSection {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  content: Record<string, unknown>;
  sortOrder: number;
  isVisible: boolean;
}

export default function CmsLandingPage() {
  const { getAuthHeaders } = useAuth();
  const { push } = useToast();
  const confirm = useConfirm();
  const [sections, setSections] = useState<LandingSection[]>([]);
  const [editing, setEditing] = useState<LandingSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSections = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cms/landing-sections', { headers: getAuthHeaders() });
      if (res.ok) {
        setSections(await res.json());
      } else {
        push({ title: 'Gagal memuat section', description: `HTTP ${res.status}`, tone: 'error' });
      }
    } catch (err) {
      push({ title: 'Network error', description: err instanceof Error ? err.message : 'Unknown', tone: 'error' });
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, push]);

  useEffect(() => { fetchSections(); }, [fetchSections]);

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const method = editing.id ? 'PUT' : 'POST';
      const res = await fetch('/api/admin/cms/landing-sections', {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(editing),
      });
      if (res.ok) {
        push({ title: 'Section tersimpan', tone: 'success' });
        setEditing(null);
        fetchSections();
      } else {
        const data = await res.json().catch(() => ({}));
        push({
          title: 'Gagal menyimpan section',
          description: data.error || `HTTP ${res.status}`,
          tone: 'error',
        });
      }
    } catch (err) {
      push({
        title: 'Network error',
        description: err instanceof Error ? err.message : 'Unknown',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Hapus section landing?',
      description: 'Section akan dihapus permanen.',
      confirmLabel: 'Hapus',
      tone: 'destructive',
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/cms/landing-sections?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        push({ title: 'Section dihapus', tone: 'success' });
        fetchSections();
      } else {
        const data = await res.json().catch(() => ({}));
        push({
          title: 'Gagal menghapus section',
          description: data.error || `HTTP ${res.status}`,
          tone: 'error',
        });
      }
    } catch (err) {
      push({
        title: 'Network error',
        description: err instanceof Error ? err.message : 'Unknown',
        tone: 'error',
      });
    }
  }

  async function handleReorder(index: number, direction: 'up' | 'down') {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sections.length) return;
    const a = sections[index];
    const b = sections[swapIndex];
    try {
      const results = await Promise.all([
        fetch('/api/admin/cms/landing-sections', { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ id: a.id, sortOrder: b.sortOrder }) }),
        fetch('/api/admin/cms/landing-sections', { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ id: b.id, sortOrder: a.sortOrder }) }),
      ]);
      const failed = results.find((r) => !r.ok);
      if (failed) {
        push({
          title: 'Gagal mengubah urutan',
          description: `HTTP ${failed.status}`,
          tone: 'error',
        });
      }
      fetchSections();
    } catch (err) {
      push({
        title: 'Network error',
        description: err instanceof Error ? err.message : 'Unknown',
        tone: 'error',
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Landing Page Editor"
        description="Kelola section-section pada halaman landing."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/" target="_blank" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Preview
              </Link>
            </Button>
            <Button
              onClick={() => setEditing({ id: '', slug: '', title: '', subtitle: '', content: {}, sortOrder: sections.length, isVisible: true })}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Tambah Section
            </Button>
          </>
        }
      />
      <GenerateEnglishButton type="all-landing" onSuccess={fetchSections} />

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
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Menyimpan…' : 'Simpan'}
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
                Batal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-10 rounded bg-muted animate-pulse" /></CardContent></Card>
          ))}
        </div>
      ) : sections.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="Belum ada section landing"
          description="Tambahkan section pertama untuk mulai membangun halaman landing dinamis."
          actions={[{
            label: 'Tambah Section',
            onClick: () => setEditing({ id: '', slug: '', title: '', subtitle: '', content: {}, sortOrder: 0, isVisible: true }),
            icon: Plus,
          }]}
        />
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
