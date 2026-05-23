'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('admin.cms.email_templates');
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
    // fetchTemplates drives setState — intentional fetch on mount + refetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTemplates();
  }, [fetchTemplates]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/cms/email-templates/new" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Template
            </Link>
          </Button>
        }
      />

      <p className="text-sm text-muted-foreground -mt-3">
        Total: <span className="font-semibold text-foreground">{templates.length}</span> template
      </p>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-14 rounded bg-muted animate-pulse" /></CardContent></Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={Mail}
          title={t('empty_title')}
          description={t('empty_desc')}
          actions={[{ label: 'New Template', href: '/admin/cms/email-templates/new', icon: Plus }]}
        />
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
