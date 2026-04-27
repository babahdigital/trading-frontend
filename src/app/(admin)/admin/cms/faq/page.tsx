'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CmsPageHeader } from '@/components/cms/page-header';
import { GenerateEnglishButton } from '@/components/cms/generate-english-button';
import { useAuth } from '@/lib/auth/auth-context';

interface FaqItem {
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
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFaqs = useCallback(async () => {
    const res = await fetch('/api/admin/cms/faq', { headers: getAuthHeaders() });
    if (res.ok) setFaqs(await res.json());
    setLoading(false);
  }, [getAuthHeaders]);

  useEffect(() => { fetchFaqs(); }, [fetchFaqs]);

  async function handleSave() {
    if (!editing) return;
    const method = editing.id ? 'PUT' : 'POST';
    await fetch('/api/admin/cms/faq', { method, headers: getAuthHeaders(), body: JSON.stringify(editing) });
    setEditing(null);
    fetchFaqs();
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus FAQ ini?')) return;
    await fetch(`/api/admin/cms/faq?id=${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    fetchFaqs();
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
        alert(`Auto-translate gagal: ${data.error ?? 'unknown'}`);
        return;
      }
      await fetchFaqs();
      // If currently editing this row, refresh editing state with new EN values
      if (editing?.id === id) {
        const updated = await fetch(`/api/admin/cms/faq`, { headers: getAuthHeaders() });
        if (updated.ok) {
          const all = await updated.json() as FaqItem[];
          const fresh = all.find((f) => f.id === id);
          if (fresh) setEditing(fresh);
        }
      }
    } catch (err) {
      alert(`Auto-translate error: ${String(err)}`);
    } finally {
      setTranslatingId(null);
    }
  }

  function hasEnglish(f: FaqItem): boolean {
    return Boolean(f.question_en && f.answer_en);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <CmsPageHeader title="FAQ Manager" previewUrl="/faq" />
          <p className="text-muted-foreground">
            Kelola FAQ. Tulis Indonesian sebagai source of truth, lalu klik <strong>Auto-translate</strong> untuk generate English via AI (boleh edit manual setelahnya).
          </p>
        </div>
        <Button onClick={() => setEditing({ id: '', question: '', answer: '', question_en: null, answer_en: null, category: 'GENERAL', sortOrder: faqs.length, isVisible: true })}>
          + Tambah FAQ
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <GenerateEnglishButton type="all-faq" onSuccess={fetchFaqs} />
        <span className="text-xs text-muted-foreground">— bulk translate semua row sekaligus</span>
      </div>

      {editing && (
        <Card>
          <CardHeader><CardTitle>{editing.id ? 'Edit FAQ' : 'Tambah FAQ'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Kategori</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
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
                <Input type="number" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: parseInt(e.target.value) || 0 })} />
              </div>
            </div>

            {/* Indonesian — Source of truth */}
            <div className="rounded-lg border border-border/60 p-4 space-y-3">
              <p className="text-xs font-mono uppercase tracking-wider text-amber-400">Bahasa Indonesia · Source of truth</p>
              <div>
                <label className="text-sm font-medium mb-1 block">Pertanyaan (ID)</label>
                <Input value={editing.question} onChange={(e) => setEditing({ ...editing, question: e.target.value })} placeholder="Contoh: Apa itu BabahAlgo?" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Jawaban (ID)</label>
                <Textarea value={editing.answer} onChange={(e) => setEditing({ ...editing, answer: e.target.value })} rows={4} placeholder="Tulis jawaban dalam Bahasa Indonesia..." />
              </div>
            </div>

            {/* English — AI-generated, manually editable */}
            <div className="rounded-lg border border-border/60 p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-foreground/60">English · AI-generated, editable</p>
                  <p className="text-xs text-muted-foreground mt-1">Klik tombol untuk auto-fill dari Indonesian via OpenRouter. Edit manual jika perlu.</p>
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
              <div>
                <label className="text-sm font-medium mb-1 block">Question (EN)</label>
                <Input
                  value={editing.question_en ?? ''}
                  onChange={(e) => setEditing({ ...editing, question_en: e.target.value || null })}
                  placeholder="Auto-translate atau tulis manual..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Answer (EN)</label>
                <Textarea
                  value={editing.answer_en ?? ''}
                  onChange={(e) => setEditing({ ...editing, answer_en: e.target.value || null })}
                  rows={4}
                  placeholder="Auto-translate atau tulis manual..."
                />
              </div>
              {!editing.id && (
                <p className="text-xs text-amber-400">
                  ⓘ Simpan dulu (Bahasa Indonesia), lalu tombol Auto-translate akan tersedia.
                </p>
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
          {faqs.map((f) => (
            <Card key={f.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{f.category}</span>
                    {hasEnglish(f) ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">✓ EN</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300">⚠ Need EN</span>
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
                      {translatingId === f.id ? 'Translating...' : '🌐 Auto-translate'}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setEditing(f)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(f.id)}>Hapus</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
