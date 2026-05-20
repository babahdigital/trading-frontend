'use client';

/**
 * New email template — minimal create form. POSTs to
 * /api/admin/cms/email-templates then redirects to the [id] editor
 * for rich subject/body editing.
 */

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import { useAuth } from '@/lib/auth/auth-context';
import { ChevronLeft, Loader2, AlertCircle } from 'lucide-react';

const SLUG_RE = /^[a-z0-9_]+$/;

export default function NewEmailTemplatePage() {
  const router = useRouter();
  const { getAuthHeaders } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [variables, setVariables] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [subjectEn, setSubjectEn] = useState('');
  const [bodyId, setBodyId] = useState('<p>Halo {{name}},</p>\n\n<p></p>\n\n<p>Salam,<br/>Tim BabahAlgo</p>');
  const [bodyEn, setBodyEn] = useState('<p>Hi {{name}},</p>\n\n<p></p>\n\n<p>Best,<br/>BabahAlgo Team</p>');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!SLUG_RE.test(slug)) {
      setError('Slug harus huruf kecil, angka, atau underscore (a-z0-9_), min 3 karakter.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/cms/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          slug: slug.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          variables: variables
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean),
          subjectId: subjectId.trim(),
          subjectEn: subjectEn.trim(),
          bodyId,
          bodyEn,
          isActive: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const details = data?.details ? JSON.stringify(data.details) : '';
        setError(`${data?.error || 'create_failed'}: ${data?.message || details || 'unknown error'}`);
        return;
      }
      router.push(`/admin/cms/email-templates/${data.template.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'network_error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-page-stack">
      <PageHeader
        eyebrow={
          <Link
            href="/admin/cms/email-templates"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-3 w-3" /> Email Templates
          </Link>
        }
        title="Template Email Baru"
        description="Buat template email transactional baru. Slug menjadi key untuk sendTemplatedEmail(slug)."
      />

      <form onSubmit={onSubmit} className="max-w-3xl space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="slug">Slug · key untuk sendTemplatedEmail() *</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="welcome_user / password_reset / trial_expired"
                required
                minLength={3}
                maxLength={60}
                pattern="^[a-z0-9_]+$"
              />
              <p className="text-xs text-muted-foreground mt-1">huruf kecil, angka, atau underscore — min 3, maks 60</p>
            </div>
            <div>
              <Label htmlFor="name">Nama Internal *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Welcome — New Customer"
                required
                minLength={2}
                maxLength={120}
              />
            </div>
            <div>
              <Label htmlFor="description">Deskripsi (opsional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dikirim setelah customer aktivasi akun"
                maxLength={500}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="variables">Variables — comma separated</Label>
              <Input
                id="variables"
                value={variables}
                onChange={(e) => setVariables(e.target.value)}
                placeholder="name, email, tier, dashboard_url"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Akan di-interpolasi via {'{{variable_name}}'} di subject + body.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subject (bilingual)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="subjectId">Subject ID *</Label>
              <Input
                id="subjectId"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                placeholder="Selamat datang di BabahAlgo, {{name}}"
                required
                minLength={1}
                maxLength={200}
              />
            </div>
            <div>
              <Label htmlFor="subjectEn">Subject EN *</Label>
              <Input
                id="subjectEn"
                value={subjectEn}
                onChange={(e) => setSubjectEn(e.target.value)}
                placeholder="Welcome to BabahAlgo, {{name}}"
                required
                minLength={1}
                maxLength={200}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Body HTML (bilingual)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bodyId">Body ID *</Label>
              <Textarea
                id="bodyId"
                value={bodyId}
                onChange={(e) => setBodyId(e.target.value)}
                rows={6}
                required
                className="font-mono text-xs"
              />
            </div>
            <div>
              <Label htmlFor="bodyEn">Body EN *</Label>
              <Textarea
                id="bodyEn"
                value={bodyEn}
                onChange={(e) => setBodyEn(e.target.value)}
                rows={6}
                required
                className="font-mono text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />}
            Buat Template
          </Button>
          <Link href="/admin/cms/email-templates">
            <Button type="button" variant="outline">
              Batal
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
