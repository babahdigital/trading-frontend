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
  name_en: string | null;
  subtitle_en: string | null;
  features_en: string[] | null;
  ctaLabel_en: string | null;
}

export default function CmsPricingPage() {
  const { getAuthHeaders } = useAuth();
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [editing, setEditing] = useState<PricingTier | null>(null);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
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

  async function handleTranslateRow(id: string) {
    setTranslatingId(id);
    try {
      const res = await fetch('/api/admin/i18n/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ type: 'pricing-tier', id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`Auto-translate gagal: ${data.error ?? 'unknown'}`);
        return;
      }
      await fetchTiers();
      if (editing?.id === id) {
        const updated = await fetch(`/api/admin/cms/pricing`, { headers: getAuthHeaders() });
        if (updated.ok) {
          const all = await updated.json() as PricingTier[];
          const fresh = all.find((t) => t.id === id);
          if (fresh) setEditing(fresh);
        }
      }
    } catch (err) {
      alert(`Auto-translate error: ${String(err)}`);
    } finally {
      setTranslatingId(null);
    }
  }

  function hasEnglish(t: PricingTier): boolean {
    return Boolean(t.name_en && t.features_en && t.features_en.length > 0);
  }

  const emptyTier: PricingTier = {
    id: '', slug: '', name: '', price: '', subtitle: '', features: [], excluded: [], note: '',
    ctaLabel: 'Daftar', ctaLink: '/register', sortOrder: tiers.length, isVisible: true,
    name_en: null, subtitle_en: null, features_en: null, ctaLabel_en: null,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <CmsPageHeader title="Pricing Tiers" description="Kelola paket harga. Tulis Indonesian dulu, lalu Auto-translate ke English." previewUrl="/pricing" />
        </div>
        <Button onClick={() => setEditing(emptyTier)}>+ Tambah Tier</Button>
      </div>
      <div className="flex items-center gap-3">
        <GenerateEnglishButton type="all-pricing" onSuccess={fetchTiers} />
        <span className="text-xs text-muted-foreground">— bulk translate semua tier sekaligus</span>
      </div>

      {editing && (
        <Card>
          <CardHeader><CardTitle>{editing.id ? 'Edit Tier' : 'Tambah Tier'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1 block">Slug</label><Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Price</label><Input value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} /></div>
            </div>

            {/* Indonesian — Source of truth */}
            <div className="rounded-lg border border-border/60 p-4 space-y-3">
              <p className="text-xs font-mono uppercase tracking-wider text-amber-400">Bahasa Indonesia · Source of truth</p>
              <div><label className="text-sm font-medium mb-1 block">Name (ID)</label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Subtitle (ID)</label><Input value={editing.subtitle || ''} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} /></div>
              <div>
                <label className="text-sm font-medium mb-1 block">Features (ID — satu per baris)</label>
                <Textarea value={(editing.features || []).join('\n')} onChange={(e) => setEditing({ ...editing, features: e.target.value.split('\n').filter(Boolean) })} rows={4} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Excluded (satu per baris)</label>
                <Textarea value={(editing.excluded || []).join('\n')} onChange={(e) => setEditing({ ...editing, excluded: e.target.value.split('\n').filter(Boolean) })} rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-sm font-medium mb-1 block">Note</label><Input value={editing.note || ''} onChange={(e) => setEditing({ ...editing, note: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">CTA Label (ID)</label><Input value={editing.ctaLabel} onChange={(e) => setEditing({ ...editing, ctaLabel: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">CTA Link</label><Input value={editing.ctaLink} onChange={(e) => setEditing({ ...editing, ctaLink: e.target.value })} /></div>
              </div>
            </div>

            {/* English — AI-generated, manually editable */}
            <div className="rounded-lg border border-border/60 p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-foreground/60">English · AI-generated, editable</p>
                  <p className="text-xs text-muted-foreground mt-1">Klik Auto-translate untuk fill dari Indonesian via OpenRouter, edit manual jika perlu.</p>
                </div>
                {editing.id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleTranslateRow(editing.id)}
                    disabled={translatingId === editing.id}
                  >
                    {translatingId === editing.id ? 'Translating...' : '🌐 Auto-translate'}
                  </Button>
                )}
              </div>
              <div><label className="text-sm font-medium mb-1 block">Name (EN)</label><Input value={editing.name_en ?? ''} onChange={(e) => setEditing({ ...editing, name_en: e.target.value || null })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Subtitle (EN)</label><Input value={editing.subtitle_en ?? ''} onChange={(e) => setEditing({ ...editing, subtitle_en: e.target.value || null })} /></div>
              <div>
                <label className="text-sm font-medium mb-1 block">Features (EN — satu per baris)</label>
                <Textarea
                  value={(editing.features_en || []).join('\n')}
                  onChange={(e) => {
                    const arr = e.target.value.split('\n').filter(Boolean);
                    setEditing({ ...editing, features_en: arr.length > 0 ? arr : null });
                  }}
                  rows={4}
                />
              </div>
              <div><label className="text-sm font-medium mb-1 block">CTA Label (EN)</label><Input value={editing.ctaLabel_en ?? ''} onChange={(e) => setEditing({ ...editing, ctaLabel_en: e.target.value || null })} /></div>
              {!editing.id && (
                <p className="text-xs text-amber-400">ⓘ Simpan dulu (Indonesian), lalu tombol Auto-translate akan tersedia.</p>
              )}
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
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {hasEnglish(t) ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">✓ EN</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300">⚠ Need EN</span>
                    )}
                    <span className="font-semibold">{t.name}</span>
                    <span className="text-primary font-bold">{t.price}</span>
                    {t.subtitle && <span className="text-muted-foreground text-sm">{t.subtitle}</span>}
                  </div>
                  {t.name_en && <span className="text-xs text-muted-foreground truncate block">EN: {t.name_en}</span>}
                </div>
                <div className="flex gap-2 shrink-0">
                  {!hasEnglish(t) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTranslateRow(t.id)}
                      disabled={translatingId === t.id}
                    >
                      {translatingId === t.id ? 'Translating...' : '🌐 Auto-translate'}
                    </Button>
                  )}
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
