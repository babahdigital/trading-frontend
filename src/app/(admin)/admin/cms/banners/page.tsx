'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ExternalLink, Megaphone, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { activeBadge } from '@/lib/admin/badges';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

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

export default function CmsBannersPage() {
  const { getAuthHeaders } = useAuth();
  const { push } = useToast();
  const confirm = useConfirm();
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [editing, setEditing] = useState<BannerItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchBanners = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cms/banners', { headers: getAuthHeaders() });
      if (res.ok) {
        setBanners(await res.json());
      } else {
        push({ title: 'Gagal memuat banners', description: `HTTP ${res.status}`, tone: 'error' });
      }
    } catch (err) {
      push({ title: 'Network error', description: err instanceof Error ? err.message : 'Unknown', tone: 'error' });
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, push]);

  // fetchBanners drives setState — intentional fetch on mount + refetch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const method = editing.id ? 'PUT' : 'POST';
      const res = await fetch('/api/admin/cms/banners', {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(editing),
      });
      if (res.ok) {
        push({ title: 'Banner tersimpan', tone: 'success' });
        setEditing(null);
        fetchBanners();
      } else {
        const data = await res.json().catch(() => ({}));
        push({
          title: 'Gagal menyimpan banner',
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
      title: 'Hapus banner?',
      description: 'Banner akan hilang dari halaman publik.',
      confirmLabel: 'Hapus',
      tone: 'destructive',
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/cms/banners?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        push({ title: 'Banner dihapus', tone: 'success' });
        fetchBanners();
      } else {
        const data = await res.json().catch(() => ({}));
        push({
          title: 'Gagal menghapus banner',
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

  const emptyBanner: BannerItem = { id: '', title: '', content: '', linkUrl: '', linkLabel: '', position: 'TOP', bgColor: '#0ea5e9', textColor: '#ffffff', isActive: true, startsAt: null, endsAt: null };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banner Manager"
        description="Kelola banner promosi di halaman publik."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/" target="_blank" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Preview
              </Link>
            </Button>
            <Button onClick={() => setEditing(emptyBanner)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Tambah Banner
            </Button>
          </>
        }
      />

      {editing && (
        <Card>
          <CardHeader><CardTitle>{editing.id ? 'Edit Banner' : 'Tambah Banner'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><label className="text-sm font-medium mb-1 block">Title</label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
            <div><label className="text-sm font-medium mb-1 block">Content</label><Textarea value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Position</label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={editing.position} onChange={(e) => setEditing({ ...editing, position: e.target.value })} aria-label="Position">
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
                <input type="checkbox" className="h-4 w-4 rounded border-input accent-amber-500" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
                Active
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
            <Card key={i}><CardContent className="p-4"><div className="h-6 w-full max-w-md rounded bg-muted animate-pulse" /></CardContent></Card>
          ))}
        </div>
      ) : banners.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Belum ada banner"
          description="Tambahkan banner pertama untuk menampilkan promosi di halaman publik."
          actions={[{ label: 'Tambah Banner', onClick: () => setEditing(emptyBanner), icon: Plus }]}
        />
      ) : (
        <div className="space-y-3">
          {banners.map((b) => {
            const ab = activeBadge(b.isActive);
            return (
              <Card key={b.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded border" style={{ backgroundColor: b.bgColor || '#0ea5e9' }} />
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{b.title}</span>
                      <span className="text-xs text-muted-foreground">{b.position}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ab.cls}`}>{ab.label}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(b)} aria-label={`Edit ${b.title}`}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(b.id)} aria-label={`Hapus ${b.title}`}>Hapus</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
