'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ExternalLink, Tags, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { GenerateEnglishButton } from '@/components/cms/generate-english-button';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

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
  const t = useTranslations('admin.cms.pricing');
  const tc = useTranslations('admin.common');
  const { getAuthHeaders } = useAuth();
  const { push } = useToast();
  const confirm = useConfirm();
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [editing, setEditing] = useState<PricingTier | null>(null);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchTiers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cms/pricing', { headers: getAuthHeaders() });
      if (res.ok) {
        setTiers(await res.json());
      } else {
        push({ title: 'Gagal memuat tier', description: `HTTP ${res.status}`, tone: 'error' });
      }
    } catch (err) {
      push({ title: 'Network error', description: err instanceof Error ? err.message : 'Unknown', tone: 'error' });
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, push]);

  // fetchTiers drives setState — intentional fetch on mount + refetch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchTiers(); }, [fetchTiers]);

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const method = editing.id ? 'PUT' : 'POST';
      const res = await fetch('/api/admin/cms/pricing', {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(editing),
      });
      if (res.ok) {
        push({ title: 'Tier tersimpan', tone: 'success' });
        setEditing(null);
        fetchTiers();
      } else {
        const data = await res.json().catch(() => ({}));
        push({
          title: 'Gagal menyimpan tier',
          description: data.error || `HTTP ${res.status}`,
          tone: 'error',
        });
      }
    } catch (err) {
      push({ title: 'Network error', description: err instanceof Error ? err.message : 'Unknown', tone: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: t('confirm_delete'),
      description: t('confirm_delete_desc'),
      confirmLabel: t('confirm_delete_btn'),
      tone: 'destructive',
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/cms/pricing?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        push({ title: 'Tier dihapus', tone: 'success' });
        fetchTiers();
      } else {
        const data = await res.json().catch(() => ({}));
        push({
          title: 'Gagal menghapus tier',
          description: data.error || `HTTP ${res.status}`,
          tone: 'error',
        });
      }
    } catch (err) {
      push({ title: 'Network error', description: err instanceof Error ? err.message : 'Unknown', tone: 'error' });
    }
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
        push({
          title: 'Auto-translate gagal',
          description: data.error || `HTTP ${res.status}`,
          tone: 'error',
        });
        return;
      }
      push({ title: 'Tier ter-translate ke English', tone: 'success' });
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
      push({
        title: 'Auto-translate error',
        description: err instanceof Error ? err.message : 'Unknown',
        tone: 'error',
      });
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
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/pricing" target="_blank" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Preview
              </Link>
            </Button>
            <Button onClick={() => setEditing(emptyTier)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              {t('btn_add')}
            </Button>
          </>
        }
      />
      <div className="flex items-center gap-3 flex-wrap">
        <GenerateEnglishButton type="all-pricing" onSuccess={fetchTiers} />
        <span className="text-xs text-muted-foreground">{t('bulk_translate_hint')}</span>
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
              <p className="text-xs font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400">Bahasa Indonesia · Source of truth</p>
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
                <p className="text-xs text-amber-600 dark:text-amber-400">ⓘ Simpan dulu (Indonesian), lalu tombol Auto-translate akan tersedia.</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? tc('saving') : tc('save')}
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>{tc('cancel')}</Button>
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
      ) : tiers.length === 0 ? (
        <EmptyState
          icon={Tags}
          title={t('empty_title')}
          description={t('empty_desc')}
          actions={[{ label: t('btn_add'), onClick: () => setEditing(emptyTier), icon: Plus }]}
        />
      ) : (
        <div className="space-y-3">
          {tiers.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {hasEnglish(t) ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">✓ EN</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">⚠ Need EN</span>
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
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(t.id)}>{tc('delete')}</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
