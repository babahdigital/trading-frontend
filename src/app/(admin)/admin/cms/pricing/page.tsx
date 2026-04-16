'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CmsPageHeader } from '@/components/cms/page-header';
import { GenerateEnglishButton } from '@/components/cms/generate-english-button';
import { useAuth } from '@/lib/auth/auth-context';

interface PricingTier {
  id: string;
  slug: string;
  name: string;
  price: string;
  subtitle: string | null;
  features: string[];
  excluded: string[];
  note: string | null;
  ctaLabel: string;
  ctaLink: string;
  sortOrder: number;
  isVisible: boolean;
}

export default function CmsPricingPage() {
  const { getAuthHeaders } = useAuth();
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [editing, setEditing] = useState<PricingTier | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTiers = useCallback(async () => {
    const res = await fetch('/api/admin/cms/pricing', { headers: getAuthHeaders() });
    if (res.ok) setTiers(await res.json());
    setLoading(false);
  }, [getAuthHeaders]);

  useEffect(() => { fetchTiers(); }, [fetchTiers]);

  async function handleSave() {
    if (!editing) return;
    const method = editing.id ? 'PUT' : 'POST';
    await fetch('/api/admin/cms/pricing', { method, headers: getAuthHeaders(), body: JSON.stringify(editing) });
    setEditing(null);
    fetchTiers();
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus tier ini?')) return;
    await fetch(`/api/admin/cms/pricing?id=${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    fetchTiers();
  }

  const emptyTier: PricingTier = { id: '', slug: '', name: '', price: '', subtitle: '', features: [], excluded: [], note: '', ctaLabel: 'Daftar', ctaLink: '/register', sortOrder: tiers.length, isVisible: true };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <CmsPageHeader title="Pricing Tiers" description="Kelola paket harga yang ditampilkan di landing page." previewUrl="/pricing" />
        </div>
        <Button onClick={() => setEditing(emptyTier)}>+ Tambah Tier</Button>
      </div>
      <GenerateEnglishButton type="all-pricing" />

      {editing && (
        <Card>
          <CardHeader><CardTitle>{editing.id ? 'Edit Tier' : 'Tambah Tier'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1 block">Slug</label><Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Name</label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1 block">Price</label><Input value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Subtitle</label><Input value={editing.subtitle || ''} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} /></div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Features (satu per baris)</label>
              <Textarea value={(editing.features || []).join('\n')} onChange={(e) => setEditing({ ...editing, features: e.target.value.split('\n').filter(Boolean) })} rows={4} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Excluded (satu per baris)</label>
              <Textarea value={(editing.excluded || []).join('\n')} onChange={(e) => setEditing({ ...editing, excluded: e.target.value.split('\n').filter(Boolean) })} rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="text-sm font-medium mb-1 block">Note</label><Input value={editing.note || ''} onChange={(e) => setEditing({ ...editing, note: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">CTA Label</label><Input value={editing.ctaLabel} onChange={(e) => setEditing({ ...editing, ctaLabel: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">CTA Link</label><Input value={editing.ctaLink} onChange={(e) => setEditing({ ...editing, ctaLink: e.target.value })} /></div>
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
          {tiers.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-primary font-bold ml-3">{t.price}</span>
                  {t.subtitle && <span className="text-muted-foreground ml-2 text-sm">{t.subtitle}</span>}
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
