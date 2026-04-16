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
  category: string;
  sortOrder: number;
  isVisible: boolean;
}

export default function CmsFaqPage() {
  const { getAuthHeaders } = useAuth();
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [editing, setEditing] = useState<FaqItem | null>(null);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <CmsPageHeader title="FAQ Manager" previewUrl="/faq" />
          <p className="text-muted-foreground">Kelola pertanyaan yang sering ditanyakan.</p>
        </div>
        <Button onClick={() => setEditing({ id: '', question: '', answer: '', category: 'GENERAL', sortOrder: faqs.length, isVisible: true })}>
          + Tambah FAQ
        </Button>
      </div>
      <GenerateEnglishButton type="all-faq" />

      {editing && (
        <Card>
          <CardHeader><CardTitle>{editing.id ? 'Edit FAQ' : 'Tambah FAQ'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Kategori</label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} aria-label="Kategori">
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
            <div>
              <label className="text-sm font-medium mb-1 block">Pertanyaan</label>
              <Input value={editing.question} onChange={(e) => setEditing({ ...editing, question: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Jawaban</label>
              <Textarea value={editing.answer} onChange={(e) => setEditing({ ...editing, answer: e.target.value })} rows={4} />
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
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded mr-2">{f.category}</span>
                  <span className="font-semibold">{f.question}</span>
                </div>
                <div className="flex gap-2">
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
