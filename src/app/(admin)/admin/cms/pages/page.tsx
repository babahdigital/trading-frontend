'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CmsPageHeader } from '@/components/cms/page-header';
import { useAuth } from '@/lib/auth/auth-context';

interface PageContent {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  subtitle: string | null;
  subtitle_en: string | null;
  body: string;
  body_en: string | null;
  sections: Record<string, unknown>[];
  isVisible: boolean;
}

const EMPTY_PAGE: PageContent = {
  id: '', slug: '', title: '', title_en: null, subtitle: null, subtitle_en: null,
  body: '', body_en: null, sections: [], isVisible: true,
};

export default function CmsPagesPage() {
  const { getAuthHeaders } = useAuth();
  const [pages, setPages] = useState<PageContent[]>([]);
  const [editing, setEditing] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPages = useCallback(async () => {
    const res = await fetch('/api/admin/cms/pages', { headers: getAuthHeaders() });
    if (res.ok) setPages(await res.json());
    setLoading(false);
  }, [getAuthHeaders]);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  async function handleSave() {
    if (!editing) return;
    const method = editing.id ? 'PUT' : 'POST';
    await fetch('/api/admin/cms/pages', {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(editing),
    });
    setEditing(null);
    fetchPages();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this page content?')) return;
    await fetch(`/api/admin/cms/pages?id=${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    fetchPages();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <CmsPageHeader title="Page Content Editor" />
          <p className="text-muted-foreground">Manage content for platform & solution pages.</p>
        </div>
        <Button onClick={() => setEditing({ ...EMPTY_PAGE })}>+ Add Page</Button>
      </div>

      {editing && (
        <Card>
          <CardHeader><CardTitle>{editing.id ? 'Edit Page' : 'Add Page'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Slug</label>
                <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="platform, solutions-signal..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Title</label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Title (EN)</label>
                <Input value={editing.title_en || ''} onChange={(e) => setEditing({ ...editing, title_en: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Subtitle</label>
                <Input value={editing.subtitle || ''} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Body (Indonesian)</label>
              <Textarea value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} rows={8} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Body (English)</label>
              <Textarea value={editing.body_en || ''} onChange={(e) => setEditing({ ...editing, body_en: e.target.value })} rows={8} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Sections (JSON array)</label>
              <Textarea
                value={JSON.stringify(editing.sections, null, 2)}
                onChange={(e) => { try { setEditing({ ...editing, sections: JSON.parse(e.target.value) }); } catch {} }}
                rows={6}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.isVisible} onChange={(e) => setEditing({ ...editing, isVisible: e.target.checked })} />
                Visible
              </label>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSave}>Save</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : pages.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No page content yet. Click &quot;+ Add Page&quot; to start.</div>
      ) : (
        <div className="space-y-3">
          {pages.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{p.slug}</span>
                    <span className="font-semibold">{p.title}</span>
                    {!p.isVisible && <span className="text-xs text-muted-foreground">(hidden)</span>}
                  </div>
                  {p.subtitle && <p className="text-sm text-muted-foreground">{p.subtitle}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(p)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)}>Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
