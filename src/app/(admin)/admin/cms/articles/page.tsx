'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ExternalLink, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { useAuth } from '@/lib/auth/auth-context';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface Article {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  excerpt: string;
  excerpt_en: string | null;
  body: string;
  body_en: string | null;
  category: string;
  author: string;
  readTime: number;
  imageUrl: string | null;
  isPublished: boolean;
  publishedAt: string | null;
}

const EMPTY_ARTICLE: Article = {
  id: '', slug: '', title: '', title_en: null, excerpt: '', excerpt_en: null,
  body: '', body_en: null, category: 'RESEARCH', author: 'Abdullah',
  readTime: 5, imageUrl: null, isPublished: false, publishedAt: null,
};

const CATEGORIES = ['RESEARCH', 'STRATEGY', 'EXECUTION', 'RISK', 'OPERATIONS', 'MARKET_ANALYSIS'];

export default function CmsArticlesPage() {
  const { getAuthHeaders } = useAuth();
  const confirm = useConfirm();
  const [articles, setArticles] = useState<Article[]>([]);
  const [editing, setEditing] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchArticles = useCallback(async () => {
    const res = await fetch('/api/admin/cms/articles', { headers: getAuthHeaders() });
    if (res.ok) setArticles(await res.json());
    setLoading(false);
  }, [getAuthHeaders]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  async function handleSave() {
    if (!editing) return;
    const method = editing.id ? 'PUT' : 'POST';
    await fetch('/api/admin/cms/articles', {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(editing),
    });
    setEditing(null);
    fetchArticles();
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Hapus article?',
      description: 'Article akan dihapus permanen dari research surface.',
      confirmLabel: 'Hapus',
      tone: 'destructive',
    });
    if (!ok) return;
    await fetch(`/api/admin/cms/articles?id=${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    fetchArticles();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Research Articles"
        description="Manage research articles and insights."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/research" target="_blank" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Preview
              </Link>
            </Button>
            <Button onClick={() => setEditing({ ...EMPTY_ARTICLE })} className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Article
            </Button>
          </>
        }
      />

      {editing && (
        <Card>
          <CardHeader><CardTitle>{editing.id ? 'Edit Article' : 'New Article'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Slug</label>
                <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="why-we-trade-14-instruments" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <select
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="w-full border border-border rounded-md px-3 py-2 bg-background text-sm"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Title</label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Title (EN)</label>
                <Input value={editing.title_en || ''} onChange={(e) => setEditing({ ...editing, title_en: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Author</label>
                <Input value={editing.author} onChange={(e) => setEditing({ ...editing, author: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Read Time (min)</label>
                <Input type="number" value={editing.readTime} onChange={(e) => setEditing({ ...editing, readTime: parseInt(e.target.value) || 5 })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Image URL</label>
                <Input value={editing.imageUrl || ''} onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Excerpt</label>
              <Textarea value={editing.excerpt} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} rows={3} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Body (Markdown supported)</label>
              <Textarea value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} rows={12} className="font-mono text-xs" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Body English</label>
              <Textarea value={editing.body_en || ''} onChange={(e) => setEditing({ ...editing, body_en: e.target.value })} rows={12} className="font-mono text-xs" />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.isPublished} onChange={(e) => setEditing({ ...editing, isPublished: e.target.checked, publishedAt: e.target.checked ? new Date().toISOString() : null })} />
                Published
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
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-6 w-full max-w-md rounded bg-muted animate-pulse" /></CardContent></Card>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Belum ada artikel"
          description="Tulis artikel pertama untuk dipublikasikan ke surface research."
          actions={[{ label: 'New Article', onClick: () => setEditing({ ...EMPTY_ARTICLE }), icon: Plus }]}
        />
      ) : (
        <div className="space-y-3">
          {articles.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{a.category}</span>
                    <span className="font-semibold">{a.title}</span>
                    {a.isPublished ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Published</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-slate-500/15 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300">Draft</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{a.excerpt.substring(0, 100)}...</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(a)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(a.id)}>Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
