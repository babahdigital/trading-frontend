'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { useAuth } from '@/lib/auth/auth-context';
import { Save, Send, Eye, ChevronLeft, Loader2, AlertCircle, CheckCircle2, FileText } from 'lucide-react';

interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  variables: string[];
  subject_id: string;
  subject_en: string;
  body_id: string;
  body_en: string;
  text_id: string | null;
  text_en: string | null;
  isActive: boolean;
}

export default function EmailTemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { getAuthHeaders } = useAuth();

  const [tpl, setTpl] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [previewLocale, setPreviewLocale] = useState<'id' | 'en'>('id');
  const [testTo, setTestTo] = useState('abdullahst.id@gmail.com');
  const [sending, setSending] = useState(false);

  const fetchTpl = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/cms/email-templates/${id}`, { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      setTpl(data.template);
    }
    setLoading(false);
  }, [id, getAuthHeaders]);

  useEffect(() => {
    // fetchTpl drives setState — intentional fetch on mount + refetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTpl();
  }, [fetchTpl]);

  function update<K extends keyof EmailTemplate>(field: K, value: EmailTemplate[K]) {
    if (!tpl) return;
    setTpl({ ...tpl, [field]: value });
  }

  async function save() {
    if (!tpl) return;
    setSaving(true);
    setFeedback(null);
    const res = await fetch(`/api/admin/cms/email-templates/${id}`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: tpl.name,
        description: tpl.description ?? '',
        variables: tpl.variables,
        subjectId: tpl.subject_id,
        subjectEn: tpl.subject_en,
        bodyId: tpl.body_id,
        bodyEn: tpl.body_en,
        textId: tpl.text_id ?? '',
        textEn: tpl.text_en ?? '',
        isActive: tpl.isActive,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setFeedback({ kind: 'ok', text: 'Template tersimpan.' });
    } else {
      const err = await res.json().catch(() => null);
      setFeedback({ kind: 'err', text: err?.message ?? 'Gagal menyimpan template.' });
    }
  }

  async function sendTest() {
    if (!testTo.trim()) return;
    setSending(true);
    setFeedback(null);
    const res = await fetch(`/api/admin/cms/email-templates/${id}/send-test`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: testTo.trim(),
        locale: previewLocale,
        vars: { user_name: 'Pak Abdullah', user_email: testTo.trim() },
      }),
    });
    setSending(false);
    if (res.ok) {
      const data = await res.json();
      setFeedback({ kind: 'ok', text: `Test terkirim. messageId: ${data.messageId || '-'}` });
    } else {
      const err = await res.json().catch(() => null);
      setFeedback({ kind: 'err', text: `Gagal: ${err?.message ?? 'unknown'}` });
    }
  }

  if (loading) {
    return (
      <div className="admin-page-stack">
        <PageHeader title="Template Email" description="Memuat…" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  if (!tpl) {
    return (
      <div className="admin-page-stack">
        <PageHeader
          eyebrow={
            <Link href="/admin/cms/email-templates" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
              <ChevronLeft className="h-3 w-3" /> Email Templates
            </Link>
          }
          title="Template tidak ditemukan"
        />
        <EmptyState
          icon={FileText}
          title="Template tidak ditemukan"
          description="Template yang Anda cari mungkin sudah dihapus atau ID tidak valid."
          actions={[{ label: 'Kembali ke daftar', href: '/admin/cms/email-templates', icon: ChevronLeft }]}
        />
      </div>
    );
  }

  const previewSubject = previewLocale === 'en' ? tpl.subject_en : tpl.subject_id;
  const previewBody = previewLocale === 'en' ? tpl.body_en : tpl.body_id;

  return (
    <div className="admin-page-stack">
      <PageHeader
        eyebrow={
          <Link href="/admin/cms/email-templates" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
            <ChevronLeft className="h-3 w-3" /> Email Templates
          </Link>
        }
        title={tpl.name}
        description={`Slug: ${tpl.slug} · ${tpl.description ?? '(tidak ada deskripsi)'}`}
      />

      {feedback && (
        <div
          role={feedback.kind === 'err' ? 'alert' : 'status'}
          aria-live={feedback.kind === 'err' ? 'assertive' : 'polite'}
          className={
            feedback.kind === 'ok'
              ? 'flex items-start gap-2 p-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'flex items-start gap-2 p-3 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
          }
        >
          {feedback.kind === 'ok' ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />}
          <span className="text-sm">{feedback.text}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Nama</label>
            <Input value={tpl.name} onChange={(e) => update('name', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Deskripsi</label>
            <Input value={tpl.description ?? ''} onChange={(e) => update('description', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Variabel yang tersedia</label>
            <div className="flex flex-wrap gap-1">
              {tpl.variables.map((v) => (
                <code key={v} className="text-xs bg-muted px-2 py-1 rounded">
                  {`{{${v}}}`}
                </code>
              ))}
              <code className="text-xs bg-muted px-2 py-1 rounded">{`{{site_url}}`}</code>
              <code className="text-xs bg-muted px-2 py-1 rounded">{`{{company_name}}`}</code>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              site_url + company_name otomatis ter-inject. Tambah variabel lain via API kalau butuh.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={tpl.isActive} onChange={(e) => update('isActive', e.target.checked)} className="h-4 w-4 rounded" />
            <span>Aktif (template dipakai saat sendTemplatedEmail)</span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subject Line</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Subject (ID)</label>
            <Input value={tpl.subject_id} onChange={(e) => update('subject_id', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Subject (EN)</label>
            <Input value={tpl.subject_en} onChange={(e) => update('subject_en', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Body HTML</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">HTML (ID)</label>
            <Textarea
              value={tpl.body_id}
              onChange={(e) => update('body_id', e.target.value)}
              rows={12}
              className="font-mono text-xs"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">HTML (EN)</label>
            <Textarea
              value={tpl.body_en}
              onChange={(e) => update('body_en', e.target.value)}
              rows={12}
              className="font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plain-text fallback (opsional, tapi recommended untuk SPF/DKIM)</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Plain text (ID)</label>
            <Textarea value={tpl.text_id ?? ''} onChange={(e) => update('text_id', e.target.value)} rows={4} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Plain text (EN)</label>
            <Textarea value={tpl.text_en ?? ''} onChange={(e) => update('text_en', e.target.value)} rows={4} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Simpan Template
        </Button>
      </div>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4" /> Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button size="sm" variant={previewLocale === 'id' ? 'default' : 'outline'} onClick={() => setPreviewLocale('id')}>
              ID
            </Button>
            <Button size="sm" variant={previewLocale === 'en' ? 'default' : 'outline'} onClick={() => setPreviewLocale('en')}>
              EN
            </Button>
            <Badge variant="outline" className="self-center text-xs">
              Pre-render — variabel masih literal {`{{...}}`}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Subject:</p>
            <div className="text-sm font-medium border border-border rounded p-2 bg-muted/30">{previewSubject}</div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Body:</p>
            <iframe
              srcDoc={previewBody}
              className="w-full h-96 border border-border rounded bg-white"
              title="Email preview"
              sandbox=""
            />
          </div>
        </CardContent>
      </Card>

      {/* Send test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" /> Kirim Email Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Render template dengan vars sample (user_name=&quot;Pak Abdullah&quot;) dan kirim ke alamat
            di bawah lewat Brevo. Berguna sebelum aktifkan template ke production flow.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant={previewLocale === 'id' ? 'default' : 'outline'} onClick={() => setPreviewLocale('id')}>
              Locale ID
            </Button>
            <Button size="sm" variant={previewLocale === 'en' ? 'default' : 'outline'} onClick={() => setPreviewLocale('en')}>
              Locale EN
            </Button>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Kirim ke</label>
            <Input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
          </div>
          <Button onClick={sendTest} disabled={sending || !testTo.trim()}>
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Kirim Test ({previewLocale.toUpperCase()})
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
