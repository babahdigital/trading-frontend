'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, ExternalLink, HelpCircle, Info, Languages, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { GenerateEnglishButton } from '@/components/cms/generate-english-button';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useCrud } from '@/lib/admin/use-crud';

interface FaqItem {
  [key: string]: unknown;
  id: string;
  question: string;
  answer: string;
  question_en: string | null;
  answer_en: string | null;
  category: string;
  sortOrder: number;
  isVisible: boolean;
}

export default function CmsFaqPage() {
  const { getAuthHeaders } = useAuth();
  const { push } = useToast();
  const confirm = useConfirm();
  const [translatingId, setTranslatingId] = useState<string | null>(null);

  const crud = useCrud<FaqItem>({ endpoint: '/api/admin/cms/faq' });

  async function onDelete(id: string) {
    const ok = await confirm({
      title: 'Hapus FAQ?',
      description: 'Tindakan ini tidak bisa dibatalkan.',
      confirmLabel: 'Hapus',
      tone: 'destructive',
    });
    if (!ok) return;
    await crud.handleDelete(id);
  }

  async function handleTranslateRow(id: string) {
    setTranslatingId(id);
    try {
      const res = await fetch('/api/admin/i18n/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ type: 'faq', id }),
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
      push({ title: 'Auto-translate selesai', tone: 'success' });
      await crud.fetchItems();
      // If currently editing this row, refresh editing state with new EN values
      if (crud.editing?.id === id) {
        const updated = await fetch(`/api/admin/cms/faq`, { headers: getAuthHeaders() });
        if (updated.ok) {
          const all = await updated.json() as FaqItem[];
          const fresh = all.find((f) => f.id === id);
          if (fresh) crud.setEditing(fresh);
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

  function hasEnglish(f: FaqItem): boolean {
    return Boolean(f.question_en && f.answer_en);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="FAQ Manager"
        description="Kelola FAQ. Tulis Indonesian sebagai source of truth, lalu klik Auto-translate untuk generate English via AI (boleh edit manual setelahnya)."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/contact#faq" target="_blank" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Preview
              </Link>
            </Button>
            <Button
              onClick={() => crud.startCreate({ id: '', question: '', answer: '', question_en: null, answer_en: null, category: 'GENERAL', sortOrder: crud.items.length, isVisible: true } as FaqItem)}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Tambah FAQ
            </Button>
          </>
        }
      />
      <div className="flex items-center gap-3 flex-wrap">
        <GenerateEnglishButton type="all-faq" onSuccess={crud.fetchItems} />
        <span className="text-xs text-muted-foreground">— bulk translate semua row sekaligus</span>
      </div>

      {crud.editing && (
        <Card>
          <CardHeader><CardTitle>{crud.editing.id ? 'Edit FAQ' : 'Tambah FAQ'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Kategori</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={crud.editing.category}
                  onChange={(e) => crud.updateField('category', e.target.value)}
                  aria-label="Kategori"
                >
                  <option value="GENERAL">General</option>
                  <option value="PRICING">Pricing</option>
                  <option value="TECHNICAL">Technical</option>
                  <option value="SECURITY">Security</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Sort Order</label>
                <Input type="number" value={crud.editing.sortOrder} onChange={(e) => crud.updateField('sortOrder', parseInt(e.target.value) || 0)} />
              </div>
            </div>

            {/* Indonesian — Source of truth */}
            <div className="rounded-lg border border-border/60 p-4 space-y-3">
              <p className="text-xs font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400">Bahasa Indonesia · Source of truth</p>
              <div>
                <label className="text-sm font-medium mb-1 block">Pertanyaan (ID)</label>
                <Input value={crud.editing.question} onChange={(e) => crud.updateField('question', e.target.value)} placeholder="Contoh: Apa itu BabahAlgo?" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Jawaban (ID)</label>
                <Textarea value={crud.editing.answer} onChange={(e) => crud.updateField('answer', e.target.value)} rows={4} placeholder="Tulis jawaban dalam Bahasa Indonesia..." />
              </div>
            </div>

            {/* English — AI-generated, manually editable */}
            <div className="rounded-lg border border-border/60 p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-foreground/60">English · AI-generated, editable</p>
                  <p className="text-xs text-muted-foreground mt-1">Klik tombol untuk auto-fill dari Indonesian via OpenRouter. Edit manual jika perlu.</p>
                </div>
                {crud.editing.id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleTranslateRow(crud.editing!.id)}
                    disabled={translatingId === crud.editing.id}
                  >
                    {translatingId === crud.editing.id ? 'Translating...' : (
                      <span className="inline-flex items-center gap-1.5"><Languages className="h-4 w-4" />Auto-translate</span>
                    )}
                  </Button>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Question (EN)</label>
                <Input
                  value={crud.editing.question_en ?? ''}
                  onChange={(e) => crud.updateField('question_en', e.target.value || null)}
                  placeholder="Auto-translate atau tulis manual..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Answer (EN)</label>
                <Textarea
                  value={crud.editing.answer_en ?? ''}
                  onChange={(e) => crud.updateField('answer_en', e.target.value || null)}
                  rows={4}
                  placeholder="Auto-translate atau tulis manual..."
                />
              </div>
              {!crud.editing.id && (
                <p className="text-xs text-amber-600 dark:text-amber-400 inline-flex items-center gap-1.5">
                  <Info className="h-4 w-4 shrink-0" />Simpan dulu (Bahasa Indonesia), lalu tombol Auto-translate akan tersedia.
                </p>
              )}
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
            <Card key={i}><CardContent className="p-4"><div className="h-12 rounded bg-muted animate-pulse" /></CardContent></Card>
          ))}
        </div>
      ) : crud.items.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="Belum ada FAQ"
          description="Tambahkan pertanyaan pertama agar tampil di halaman /faq publik."
          actions={[{
            label: 'Tambah FAQ',
            onClick: () => crud.startCreate({ id: '', question: '', answer: '', question_en: null, answer_en: null, category: 'GENERAL', sortOrder: 0, isVisible: true } as FaqItem),
            icon: Plus,
          }]}
        />
      ) : (
        <div className="space-y-3">
          {crud.items.map((f) => (
            <Card key={f.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{f.category}</span>
                    {hasEnglish(f) ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 inline-flex items-center gap-1"><Check className="h-3 w-3" />EN</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Need EN</span>
                    )}
                  </div>
                  <span className="font-semibold truncate block">{f.question}</span>
                  {f.question_en && (
                    <span className="text-xs text-muted-foreground truncate block mt-0.5">EN: {f.question_en}</span>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {!hasEnglish(f) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTranslateRow(f.id)}
                      disabled={translatingId === f.id}
                    >
                      {translatingId === f.id ? 'Translating...' : (
                        <span className="inline-flex items-center gap-1.5"><Languages className="h-4 w-4" />Auto-translate</span>
                      )}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => crud.startEdit(f)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => onDelete(f.id)}>Hapus</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
