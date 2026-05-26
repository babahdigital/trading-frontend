'use client';

import Link from 'next/link';
import { ExternalLink, LayoutTemplate, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { ImageUploadField } from '@/components/admin/image-upload-field';
import { activeBadge } from '@/lib/admin/badges';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useCrud } from '@/lib/admin/use-crud';

interface PopupItem {
  [key: string]: unknown;
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

const emptyPopup: PopupItem = { id: '', title: '', content: '', imageUrl: '', ctaLabel: '', ctaLink: '', trigger: 'DELAY', triggerValue: '3000', isActive: true };

export default function CmsPopupsPage() {
  const confirm = useConfirm();

  const crud = useCrud<PopupItem>({ endpoint: '/api/admin/cms/popups' });

  async function onDelete(id: string) {
    const ok = await confirm({
      title: 'Hapus popup?',
      description: 'Popup tidak akan muncul lagi untuk pengunjung.',
      confirmLabel: 'Hapus',
      tone: 'destructive',
    });
    if (!ok) return;
    await crud.handleDelete(id);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Popup Manager"
        description="Kelola popup/modal yang muncul di halaman publik."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/" target="_blank" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Preview
              </Link>
            </Button>
            <Button onClick={() => crud.startCreate(emptyPopup)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Tambah Popup
            </Button>
          </>
        }
      />

      {crud.editing && (
        <Card>
          <CardHeader><CardTitle>{crud.editing.id ? 'Edit Popup' : 'Tambah Popup'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><label className="text-sm font-medium mb-1 block">Title</label><Input value={crud.editing.title} onChange={(e) => crud.updateField('title', e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Content</label><Textarea value={crud.editing.content} onChange={(e) => crud.updateField('content', e.target.value)} rows={4} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Trigger</label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" value={crud.editing.trigger} onChange={(e) => crud.updateField('trigger', e.target.value)} aria-label="Trigger">
                  <option value="DELAY">Delay (ms)</option>
                  <option value="EXIT_INTENT">Exit Intent</option>
                  <option value="SCROLL">Scroll %</option>
                  <option value="PAGE_LOAD">Page Load</option>
                </select>
              </div>
              <div><label className="text-sm font-medium mb-1 block">Trigger Value</label><Input value={crud.editing.triggerValue || ''} onChange={(e) => crud.updateField('triggerValue', e.target.value)} placeholder="3000" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1 block">CTA Label</label><Input value={crud.editing.ctaLabel || ''} onChange={(e) => crud.updateField('ctaLabel', e.target.value)} /></div>
              <div><label className="text-sm font-medium mb-1 block">CTA Link</label><Input value={crud.editing.ctaLink || ''} onChange={(e) => crud.updateField('ctaLink', e.target.value)} /></div>
            </div>
            <ImageUploadField
              label="Image URL"
              value={crud.editing.imageUrl}
              onChange={(url) => crud.updateField('imageUrl', url)}
            />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 rounded border-input accent-amber-500" checked={crud.editing.isActive} onChange={(e) => crud.updateField('isActive', e.target.checked as PopupItem['isActive'])} /> Active</label>
            </div>
            <div className="flex gap-3">
              <Button onClick={crud.handleSave} disabled={crud.saving}>
                {crud.saving ? 'Menyimpan…' : 'Simpan'}
              </Button>
              <Button variant="outline" onClick={crud.cancelEdit} disabled={crud.saving}>
                Batal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {crud.loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-6 w-full max-w-md rounded bg-muted animate-pulse" /></CardContent></Card>
          ))}
        </div>
      ) : crud.items.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="Belum ada popup"
          description="Tambahkan popup pertama untuk meningkatkan konversi pada halaman publik."
          actions={[{ label: 'Tambah Popup', onClick: () => crud.startCreate(emptyPopup), icon: Plus }]}
        />
      ) : (
        <div className="space-y-3">
          {crud.items.map((p) => {
            const ab = activeBadge(p.isActive);
            return (
              <Card key={p.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{p.title}</span>
                    <span className="text-xs text-muted-foreground">{p.trigger}: {p.triggerValue}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ab.cls}`}>{ab.label}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => crud.startEdit(p)} aria-label={`Edit ${p.title}`}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => onDelete(p.id)} aria-label={`Hapus ${p.title}`}>Hapus</Button>
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
