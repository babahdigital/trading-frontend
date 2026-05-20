'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CmsPageHeader } from '@/components/cms/page-header';
import { ImageUploadField } from '@/components/admin/image-upload-field';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface PopupItem {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaLink: string | null;
  trigger: string;
  triggerValue: string | null;
  isActive: boolean;
}

export default function CmsPopupsPage() {
  const { getAuthHeaders } = useAuth();
  const { push } = useToast();
  const confirm = useConfirm();
  const [popups, setPopups] = useState<PopupItem[]>([]);
  const [editing, setEditing] = useState<PopupItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPopups = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cms/popups', { headers: getAuthHeaders() });
      if (res.ok) {
        setPopups(await res.json());
      } else {
        push({ title: 'Gagal memuat popups', description: `HTTP ${res.status}`, tone: 'error' });
      }
    } catch (err) {
      push({ title: 'Network error', description: err instanceof Error ? err.message : 'Unknown', tone: 'error' });
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, push]);

  useEffect(() => { fetchPopups(); }, [fetchPopups]);

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const method = editing.id ? 'PUT' : 'POST';
      const res = await fetch('/api/admin/cms/popups', {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(editing),
      });
      if (res.ok) {
        push({ title: 'Popup tersimpan', tone: 'success' });
        setEditing(null);
        fetchPopups();
      } else {
        const data = await res.json().catch(() => ({}));
        push({
          title: 'Gagal menyimpan popup',
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
      title: 'Hapus popup?',
      description: 'Popup tidak akan muncul lagi untuk pengunjung.',
      confirmLabel: 'Hapus',
      tone: 'destructive',
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/cms/popups?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        push({ title: 'Popup dihapus', tone: 'success' });
        fetchPopups();
      } else {
        const data = await res.json().catch(() => ({}));
        push({
          title: 'Gagal menghapus popup',
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

  const emptyPopup: PopupItem = { id: '', title: '', content: '', imageUrl: '', ctaLabel: '', ctaLink: '', trigger: 'DELAY', triggerValue: '3000', isActive: true };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <CmsPageHeader title="Popup Manager" previewUrl="/" />
          <p className="text-muted-foreground">Kelola popup/modal yang muncul di halaman publik.</p>
        </div>
        <Button onClick={() => setEditing(emptyPopup)}>+ Tambah Popup</Button>
      </div>

      {editing && (
        <Card>
          <CardHeader><CardTitle>{editing.id ? 'Edit Popup' : 'Tambah Popup'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><label className="text-sm font-medium mb-1 block">Title</label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
            <div><label className="text-sm font-medium mb-1 block">Content</label><Textarea value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} rows={4} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Trigger</label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={editing.trigger} onChange={(e) => setEditing({ ...editing, trigger: e.target.value })} aria-label="Trigger">
                  <option value="DELAY">Delay (ms)</option>
                  <option value="EXIT_INTENT">Exit Intent</option>
                  <option value="SCROLL">Scroll %</option>
                  <option value="PAGE_LOAD">Page Load</option>
                </select>
              </div>
              <div><label className="text-sm font-medium mb-1 block">Trigger Value</label><Input value={editing.triggerValue || ''} onChange={(e) => setEditing({ ...editing, triggerValue: e.target.value })} placeholder="3000" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1 block">CTA Label</label><Input value={editing.ctaLabel || ''} onChange={(e) => setEditing({ ...editing, ctaLabel: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">CTA Link</label><Input value={editing.ctaLink || ''} onChange={(e) => setEditing({ ...editing, ctaLink: e.target.value })} /></div>
            </div>
            <ImageUploadField
              label="Image URL"
              value={editing.imageUrl}
              onChange={(url) => setEditing({ ...editing, imageUrl: url })}
            />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} /> Active</label>
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

      {loading ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : (
        <div className="space-y-3">
          {popups.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-semibold">{p.title}</span>
                  <span className="text-xs text-muted-foreground ml-2">{p.trigger}: {p.triggerValue} {p.isActive ? '' : '(inactive)'}</span>
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
