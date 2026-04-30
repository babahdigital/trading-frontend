'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CmsPageHeader } from '@/components/cms/page-header';
import { useAuth } from '@/lib/auth/auth-context';
import { Mail, Edit, Plus } from 'lucide-react';

interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  variables: string[];
  subject_id: string;
  subject_en: string;
  isActive: boolean;
  updatedAt: string;
}

export default function EmailTemplatesPage() {
  const { getAuthHeaders } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/cms/email-templates', { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      setTemplates(data.templates);
    }
    setLoading(false);
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Email Templates"
        description="Edit subject + body email transactional. Bilingual id/en. Variable interpolation pakai {{variable_name}}. Setiap template di-load dari DB saat dipakai sendTemplatedEmail()."
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{templates.length}</span> template
        </p>
        <Button variant="outline" disabled title="Coming soon — buat template baru lewat seed migration dulu">
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Memuat…</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
          Belum ada template. Migration seed harusnya menambahkan welcome_user, password_reset, lead_confirmation default.
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((tpl) => (
            <Card key={tpl.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{tpl.name}</span>
                    <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{tpl.slug}</code>
                    {!tpl.isActive && <Badge variant="secondary">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    ID: {tpl.subject_id} <span className="mx-2">·</span> EN: {tpl.subject_en}
                  </p>
                  {tpl.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tpl.variables.map((v) => (
                        <code key={v} className="text-[10px] text-muted-foreground bg-muted/60 px-1 py-0.5 rounded">
                          {`{{${v}}}`}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
                <Link href={`/admin/cms/email-templates/${tpl.id}`}>
                  <Button variant="outline" size="sm">
                    <Edit className="h-3 w-3 mr-1.5" /> Edit
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
