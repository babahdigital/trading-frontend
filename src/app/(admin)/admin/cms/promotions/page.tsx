'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ExternalLink, Megaphone, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { ImageUploadField } from '@/components/admin/image-upload-field';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

/* ── Types ─────────────────────────────────────────────────────────────── */

type PromoStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'PAUSED' | 'REJECTED';
type DiscountType = 'PERCENT' | 'FIXED_IDR';
type PopupTrigger = 'DELAY' | 'EXIT_INTENT' | 'SCROLL' | 'PAGE_LOAD';

interface Promotion {
  id: string;
  slug: string;
  name: string;
  name_en: string | null;
  description: string;
  description_en: string | null;
  discountType: DiscountType;
  discountValue: string | number;
  applicableTiers: string[];
  maxUsage: number;
  currentUsage: number;
  popupTitle: string | null;
  popupTitle_en: string | null;
  popupBody: string | null;
  popupBody_en: string | null;
  heroImageUrl: string | null;
  heroImageUrl_en: string | null;
  ctaLabel: string | null;
  ctaLabel_en: string | null;
  ctaLink: string | null;
  popupTrigger: PopupTrigger;
  popupDelayMs: number;
  startsAt: string;
  endsAt: string;
  status: PromoStatus;
  aiGenerated: boolean;
  aiContext: Record<string, unknown> | null;
  aiImagePrompt: string | null;
  confidence: number;
  calendarEventId: string | null;
  calendarEvent?: { slug: string; name: string; eventDate: string } | null;
  createdAt: string;
  updatedAt: string;
}

/* ── Status badge ──────────────────────────────────────────────────────── */

const STATUS_BADGE: Record<PromoStatus, { label: string; cls: string }> = {
  DRAFT:     { label: 'Draft',     cls: 'bg-slate-500/15 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300' },
  SCHEDULED: { label: 'Scheduled', cls: 'bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300' },
  ACTIVE:    { label: 'Active',    cls: 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
  EXPIRED:   { label: 'Expired',   cls: 'bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' },
  PAUSED:    { label: 'Paused',    cls: 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
  REJECTED:  { label: 'Rejected',  cls: 'bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' },
};

const ALL_STATUSES: PromoStatus[] = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'EXPIRED', 'PAUSED', 'REJECTED'];
const TRIGGERS: PopupTrigger[] = ['DELAY', 'EXIT_INTENT', 'SCROLL', 'PAGE_LOAD'];

/* ── Helpers ───────────────────────────────────────────────────────────── */

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

function fmtDiscount(type: DiscountType, value: string | number) {
  const v = typeof value === 'string' ? parseFloat(value) : value;
  if (type === 'PERCENT') return `${v}%`;
  return `Rp ${v.toLocaleString('id-ID')}`;
}

function toLocalDatetimeInput(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ''; }
}

function fromLocalDatetimeInput(v: string): string {
  try {
    return new Date(v).toISOString();
  } catch { return v; }
}

/* ── Default pricing tier slugs (fetched from API) ─────────────────────── */

const FALLBACK_TIER_SLUGS = ['free_demo', 'starter', 'professional', 'elite', 'hnwi'];

/* ── Component ─────────────────────────────────────────────────────────── */

export default function CmsPromotionsPage() {
  const { getAuthHeaders } = useAuth();
  const { push } = useToast();
  const confirm = useConfirm();

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PromoStatus | ''>('');
  const [tierSlugs, setTierSlugs] = useState<string[]>(FALLBACK_TIER_SLUGS);

  /* ── Fetch tier slugs for multi-select ────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/cms/pricing/tiers');
        if (res.ok) {
          const data = await res.json();
          const slugs = (Array.isArray(data) ? data : data.tiers ?? [])
            .map((t: { slug?: string }) => t.slug)
            .filter(Boolean) as string[];
          if (slugs.length > 0) setTierSlugs(slugs);
        }
      } catch { /* use fallback */ }
    })();
  }, []);

  /* ── Fetch promotions ─────────────────────────────────────────────────── */
  const fetchPromotions = useCallback(async () => {
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await fetch(`/api/admin/cms/promotions${params}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPromotions(data.items ?? []);
      } else {
        push({ title: 'Gagal memuat promotions', description: `HTTP ${res.status}`, tone: 'error' });
      }
    } catch (err) {
      push({ title: 'Network error', description: err instanceof Error ? err.message : 'Unknown', tone: 'error' });
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, push, statusFilter]);

  // fetchPromotions drives setState — intentional fetch on mount + refetch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchPromotions(); }, [fetchPromotions]);

  /* ── Save (create or update) ──────────────────────────────────────────── */
  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const isNew = !editing.id;
      const method = isNew ? 'POST' : 'PATCH';

      const payload: Record<string, unknown> = {
        slug: editing.slug,
        name: editing.name,
        name_en: editing.name_en || null,
        description: editing.description,
        description_en: editing.description_en || null,
        discountType: editing.discountType,
        discountValue: typeof editing.discountValue === 'string' ? parseFloat(editing.discountValue) || 0 : editing.discountValue,
        applicableTiers: editing.applicableTiers,
        maxUsage: editing.maxUsage,
        popupTitle: editing.popupTitle || null,
        popupTitle_en: editing.popupTitle_en || null,
        popupBody: editing.popupBody || null,
        popupBody_en: editing.popupBody_en || null,
        heroImageUrl: editing.heroImageUrl || null,
        heroImageUrl_en: editing.heroImageUrl_en || null,
        ctaLabel: editing.ctaLabel || null,
        ctaLabel_en: editing.ctaLabel_en || null,
        ctaLink: editing.ctaLink || null,
        popupTrigger: editing.popupTrigger,
        popupDelayMs: editing.popupDelayMs,
        startsAt: editing.startsAt,
        endsAt: editing.endsAt,
        status: editing.status,
        aiGenerated: editing.aiGenerated,
        aiImagePrompt: editing.aiImagePrompt || null,
        confidence: editing.confidence,
        calendarEventId: editing.calendarEventId || null,
      };

      if (!isNew) payload.id = editing.id;

      const res = await fetch('/api/admin/cms/promotions', {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        push({ title: isNew ? 'Promotion dibuat' : 'Promotion diperbarui', tone: 'success' });
        setEditing(null);
        fetchPromotions();
      } else {
        const data = await res.json().catch(() => ({}));
        push({
          title: 'Gagal menyimpan promotion',
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

  /* ── Delete ───────────────────────────────────────────────────────────── */
  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Hapus promotion?',
      description: 'Promotion akan dihapus permanen dan tidak bisa di-restore.',
      confirmLabel: 'Hapus',
      tone: 'destructive',
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/cms/promotions?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        push({ title: 'Promotion dihapus', tone: 'success' });
        fetchPromotions();
      } else {
        const data = await res.json().catch(() => ({}));
        push({
          title: 'Gagal menghapus promotion',
          description: data.error || `HTTP ${res.status}`,
          tone: 'error',
        });
      }
    } catch (err) {
      push({ title: 'Network error', description: err instanceof Error ? err.message : 'Unknown', tone: 'error' });
    }
  }

  /* ── Tier multi-select toggle ─────────────────────────────────────────── */
  function toggleTier(slug: string) {
    if (!editing) return;
    const current = editing.applicableTiers ?? [];
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug];
    setEditing({ ...editing, applicableTiers: next });
  }

  /* ── Empty promotion template ─────────────────────────────────────────── */
  const now = new Date();
  const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const emptyPromo: Promotion = {
    id: '',
    slug: '',
    name: '',
    name_en: null,
    description: '',
    description_en: null,
    discountType: 'PERCENT',
    discountValue: 0,
    applicableTiers: [],
    maxUsage: 0,
    currentUsage: 0,
    popupTitle: null,
    popupTitle_en: null,
    popupBody: null,
    popupBody_en: null,
    heroImageUrl: null,
    heroImageUrl_en: null,
    ctaLabel: null,
    ctaLabel_en: null,
    ctaLink: '/pricing',
    popupTrigger: 'DELAY',
    popupDelayMs: 3000,
    startsAt: now.toISOString(),
    endsAt: inOneWeek.toISOString(),
    status: 'DRAFT',
    aiGenerated: false,
    aiContext: null,
    aiImagePrompt: null,
    confidence: 0,
    calendarEventId: null,
    createdAt: '',
    updatedAt: '',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promotions"
        description="Kelola promo, diskon, dan campaign popup. Diskon diterapkan di checkout."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/pricing" target="_blank" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Preview
              </Link>
            </Button>
            <Button onClick={() => setEditing(emptyPromo)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Tambah Promotion
            </Button>
          </>
        }
      />

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PromoStatus | '')}
          aria-label="Filter status"
        >
          <option value="">Semua Status</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{promotions.length} promotion(s)</span>
      </div>

      {/* ── Edit / Create modal ─────────────────────────────────────────── */}
      {editing && (
        <Card>
          <CardHeader><CardTitle>{editing.id ? 'Edit Promotion' : 'Tambah Promotion'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Core fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Slug</label>
                <Input
                  value={editing.slug}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  placeholder="christmas-2026"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value as PromoStatus })}
                  aria-label="Status"
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Indonesian — Source of truth */}
            <div className="rounded-lg border border-border/60 p-4 space-y-3">
              <p className="text-xs font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400">Bahasa Indonesia - Source of truth</p>
              <div>
                <label className="text-sm font-medium mb-1 block">Name (ID)</label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description (ID)</label>
                <Textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            {/* English */}
            <div className="rounded-lg border border-border/60 p-4 space-y-3 bg-muted/20">
              <p className="text-xs font-mono uppercase tracking-wider text-foreground/60">English - AI-generated, editable</p>
              <div>
                <label className="text-sm font-medium mb-1 block">Name (EN)</label>
                <Input value={editing.name_en ?? ''} onChange={(e) => setEditing({ ...editing, name_en: e.target.value || null })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description (EN)</label>
                <Textarea
                  value={editing.description_en ?? ''}
                  onChange={(e) => setEditing({ ...editing, description_en: e.target.value || null })}
                  rows={3}
                />
              </div>
            </div>

            {/* Discount */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Discount Type</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={editing.discountType}
                  onChange={(e) => setEditing({ ...editing, discountType: e.target.value as DiscountType })}
                  aria-label="Discount type"
                >
                  <option value="PERCENT">Percent (%)</option>
                  <option value="FIXED_IDR">Fixed IDR (Rp)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Discount Value</label>
                <Input
                  type="number"
                  min={0}
                  value={typeof editing.discountValue === 'string' ? editing.discountValue : String(editing.discountValue)}
                  onChange={(e) => setEditing({ ...editing, discountValue: e.target.value })}
                />
              </div>
            </div>

            {/* Applicable Tiers (multi-select chips) */}
            <div>
              <label className="text-sm font-medium mb-1 block">Applicable Tiers <span className="text-xs text-muted-foreground">(kosong = semua tier)</span></label>
              <div className="flex flex-wrap gap-2 mt-1">
                {tierSlugs.map((slug) => {
                  const selected = (editing.applicableTiers ?? []).includes(slug);
                  return (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => toggleTier(slug)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        selected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                      }`}
                    >
                      {slug}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Usage */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Max Usage <span className="text-xs text-muted-foreground">(0 = unlimited)</span></label>
                <Input
                  type="number"
                  min={0}
                  value={editing.maxUsage}
                  onChange={(e) => setEditing({ ...editing, maxUsage: parseInt(e.target.value) || 0 })}
                />
              </div>
              {editing.id && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Current Usage</label>
                  <Input type="number" value={editing.currentUsage} disabled />
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Starts At</label>
                <Input
                  type="datetime-local"
                  value={toLocalDatetimeInput(editing.startsAt)}
                  onChange={(e) => setEditing({ ...editing, startsAt: fromLocalDatetimeInput(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Ends At</label>
                <Input
                  type="datetime-local"
                  value={toLocalDatetimeInput(editing.endsAt)}
                  onChange={(e) => setEditing({ ...editing, endsAt: fromLocalDatetimeInput(e.target.value) })}
                />
              </div>
            </div>

            {/* Popup display */}
            <div className="rounded-lg border border-border/60 p-4 space-y-3">
              <p className="text-xs font-mono uppercase tracking-wider text-foreground/60">Popup / Display Settings</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Popup Title</label>
                  <Input value={editing.popupTitle ?? ''} onChange={(e) => setEditing({ ...editing, popupTitle: e.target.value || null })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Popup Title (EN)</label>
                  <Input value={editing.popupTitle_en ?? ''} onChange={(e) => setEditing({ ...editing, popupTitle_en: e.target.value || null })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Popup Body</label>
                <Textarea
                  value={editing.popupBody ?? ''}
                  onChange={(e) => setEditing({ ...editing, popupBody: e.target.value || null })}
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Popup Body (EN)</label>
                <Textarea
                  value={editing.popupBody_en ?? ''}
                  onChange={(e) => setEditing({ ...editing, popupBody_en: e.target.value || null })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">CTA Label</label>
                  <Input value={editing.ctaLabel ?? ''} onChange={(e) => setEditing({ ...editing, ctaLabel: e.target.value || null })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">CTA Label (EN)</label>
                  <Input value={editing.ctaLabel_en ?? ''} onChange={(e) => setEditing({ ...editing, ctaLabel_en: e.target.value || null })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">CTA Link</label>
                  <Input value={editing.ctaLink ?? ''} onChange={(e) => setEditing({ ...editing, ctaLink: e.target.value || null })} placeholder="/pricing" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Popup Trigger</label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={editing.popupTrigger}
                    onChange={(e) => setEditing({ ...editing, popupTrigger: e.target.value as PopupTrigger })}
                    aria-label="Popup trigger"
                  >
                    {TRIGGERS.map((t) => (
                      <option key={t} value={t}>{t.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Popup Delay (ms)</label>
                  <Input
                    type="number"
                    min={0}
                    value={editing.popupDelayMs}
                    onChange={(e) => setEditing({ ...editing, popupDelayMs: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <ImageUploadField
                label="Hero Image (ID)"
                value={editing.heroImageUrl}
                onChange={(url) => setEditing({ ...editing, heroImageUrl: url })}
              />
              <ImageUploadField
                label="Hero Image (EN)"
                value={editing.heroImageUrl_en}
                onChange={(url) => setEditing({ ...editing, heroImageUrl_en: url })}
              />
            </div>

            {/* AI metadata */}
            <div className="rounded-lg border border-border/60 p-4 space-y-3 bg-muted/20">
              <p className="text-xs font-mono uppercase tracking-wider text-foreground/60">AI Strategist Metadata</p>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.aiGenerated}
                    onChange={(e) => setEditing({ ...editing, aiGenerated: e.target.checked })}
                  />
                  AI Generated
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Confidence (0-100)</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="w-24"
                    value={editing.confidence}
                    onChange={(e) => setEditing({ ...editing, confidence: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">AI Image Prompt</label>
                <Textarea
                  value={editing.aiImagePrompt ?? ''}
                  onChange={(e) => setEditing({ ...editing, aiImagePrompt: e.target.value || null })}
                  rows={2}
                  placeholder="Prompt yang dipakai untuk generate hero image..."
                />
              </div>
            </div>

            {/* Save/Cancel */}
            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Batal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── List ────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-10 rounded bg-muted animate-pulse" /></CardContent></Card>
          ))}
        </div>
      ) : promotions.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Belum ada promotion"
          description="Tambahkan promotion pertama untuk campaign diskon di checkout."
          actions={[{ label: 'Tambah Promotion', onClick: () => setEditing(emptyPromo), icon: Plus }]}
        />
      ) : (
        <div className="space-y-3">
          {promotions.map((p) => {
            const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.DRAFT;
            return (
              <Card key={p.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-primary font-bold text-sm">{fmtDiscount(p.discountType, p.discountValue)}</span>
                      {p.aiGenerated && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-violet-500/15 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 inline-flex items-center gap-0.5">
                          <Sparkles className="h-2.5 w-2.5" />
                          AI {p.confidence > 0 && `${p.confidence}%`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="font-mono">{p.slug}</span>
                      <span>{fmtDate(p.startsAt)} - {fmtDate(p.endsAt)}</span>
                      <span>Usage: {p.currentUsage}/{p.maxUsage === 0 ? '∞' : p.maxUsage}</span>
                      {p.calendarEvent && (
                        <span className="text-sky-600 dark:text-sky-400">Event: {p.calendarEvent.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setEditing(p)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)}>Hapus</Button>
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
