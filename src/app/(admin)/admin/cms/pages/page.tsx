'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileCode2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface PageContent {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  subtitle: string | null;
  subtitle_en: string | null;
  body: string;
  body_en: string | null;
  sections: Record<string, unknown>[];
  isVisible: boolean;
}

const EMPTY_PAGE: PageContent = {
  id: '', slug: '', title: '', title_en: null, subtitle: null, subtitle_en: null,
  body: '', body_en: null, sections: [], isVisible: true,
};

export default function CmsPagesPage() {
  const { getAuthHeaders } = useAuth();
  const { push } = useToast();
  const confirm = useConfirm();
  const [pages, setPages] = useState<PageContent[]>([]);
  const [editing, setEditing] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPages = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cms/pages', { headers: getAuthHeaders() });
      if (res.ok) {
        setPages(await res.json());
      } else {
        push({ title: 'Gagal memuat page', description: `HTTP ${res.status}`, tone: 'error' });
      }
    } catch (err) {
      push({ title: 'Network error', description: err instanceof Error ? err.message : 'Unknown', tone: 'error' });
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, push]);

  // fetchPages drives setState — intentional fetch on mount + refetch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchPages(); }, [fetchPages]);

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const method = editing.id ? 'PUT' : 'POST';
      const res = await fetch('/api/admin/cms/pages', {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(editing),
      });
      if (res.ok) {
        push({ title: 'Page tersimpan', tone: 'success' });
        setEditing(null);
        fetchPages();
      } else {
        const data = await res.json().catch(() => ({}));
        push({
          title: 'Gagal menyimpan page',
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
      title: 'Hapus page?',
      description: 'Halaman akan hilang dari sitemap dan tidak bisa diakses publik.',
      confirmLabel: 'Hapus',
      tone: 'destructive',
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/cms/pages?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        push({ title: 'Page dihapus', tone: 'success' });
        fetchPages();
      } else {
        const data = await res.json().catch(() => ({}));
        push({
          title: 'Gagal menghapus page',
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Page Content Editor"
        description="Manage content for platform & solution pages."
        actions={
          <Button onClick={() => setEditing({ ...EMPTY_PAGE })} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Page
          </Button>
        }
      />

      {editing && (
        <Card>
          <CardHeader><CardTitle>{editing.id ? 'Edit Page' : 'Add Page'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Slug</label>
                <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="platform, solutions-signal..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Title</label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Title (EN)</label>
                <Input value={editing.title_en || ''} onChange={(e) => setEditing({ ...editing, title_en: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Subtitle</label>
                <Input value={editing.subtitle || ''} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Body (Indonesian)</label>
              <Textarea value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} rows={8} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Body (English)</label>
              <Textarea value={editing.body_en || ''} onChange={(e) => setEditing({ ...editing, body_en: e.target.value })} rows={8} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Sections (JSON array)</label>
              <Textarea
                value={JSON.stringify(editing.sections, null, 2)}
                onChange={(e) => { try { setEditing({ ...editing, sections: JSON.parse(e.target.value) }); } catch {} }}
                rows={6}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 rounded border-input accent-amber-500" checked={editing.isVisible} onChange={(e) => setEditing({ ...editing, isVisible: e.target.checked })} />
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
      ) : pages.length === 0 ? (
        <EmptyState
          icon={FileCode2}
          title="Belum ada page content"
          description="Tambahkan konten page pertama untuk dipublikasikan di platform/solusi."
          actions={[{ label: 'Add Page', onClick: () => setEditing({ ...EMPTY_PAGE }), icon: Plus }]}
        />
      ) : (
        <div className="space-y-3">
          {pages.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{p.slug}</span>
                    <span className="font-semibold">{p.title}</span>
                    {!p.isVisible && <span className="text-xs text-muted-foreground">(hidden)</span>}
                  </div>
                  {p.subtitle && <p className="text-sm text-muted-foreground">{p.subtitle}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(p)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)}>Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
