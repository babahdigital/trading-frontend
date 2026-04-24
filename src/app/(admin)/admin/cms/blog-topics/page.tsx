'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CmsPageHeader } from '@/components/cms/page-header';
import { useAuth } from '@/lib/auth/auth-context';

interface BlogTopic {
  id: string;
  slug: string;
  titleId: string;
  titleEn: string;
  excerptId: string;
  excerptEn: string;
  promptTemplate: string;
  dataSources: unknown;
  keywords: unknown;
  category: string;
  assetClass: string;
  targetLengthWords: number;
  scheduledWeek: number;
  priority: number;
  status: string;
  lastGeneratedAt: string | null;
  lastError: string | null;
  aiModel: string | null;
  aiTokensUsed: number;
  articleId: string | null;
  isActive: boolean;
  autoPublish: boolean;
  article?: {
    id: string;
    slug: string;
    isPublished: boolean;
    publishedAt: string | null;
    readTime: number;
  } | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-slate-500/20 text-slate-300',
  GENERATING: 'bg-blue-500/20 text-blue-300 animate-pulse',
  GENERATED: 'bg-yellow-500/20 text-yellow-300',
  PUBLISHED: 'bg-green-500/20 text-green-300',
  FAILED: 'bg-red-500/20 text-red-300',
  DISABLED: 'bg-muted text-muted-foreground',
};

const ASSET_CLASS_COLORS: Record<string, string> = {
  FOREX: 'bg-sky-500/20 text-sky-300',
  CRYPTO: 'bg-orange-500/20 text-orange-300',
  MULTI: 'bg-purple-500/20 text-purple-300',
};

export default function BlogTopicsPage() {
  const { getAuthHeaders } = useAuth();
  const [topics, setTopics] = useState<BlogTopic[]>([]);
  const [editing, setEditing] = useState<BlogTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<{ status?: string; assetClass?: string }>({});

  const fetchTopics = useCallback(async () => {
    const qs = new URLSearchParams();
    if (filter.status) qs.set('status', filter.status);
    if (filter.assetClass) qs.set('assetClass', filter.assetClass);
    const url = `/api/admin/blog-topics${qs.toString() ? `?${qs}` : ''}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (res.ok) setTopics(await res.json());
    setLoading(false);
  }, [getAuthHeaders, filter]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  async function handleRegenerate(topic: BlogTopic) {
    if (!confirm(`Regenerate "${topic.titleId}" via OpenRouter? This will consume AI tokens.`)) return;
    setRegeneratingId(topic.id);
    try {
      const res = await fetch(`/api/admin/blog-topics/${topic.id}/regenerate`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const result = await res.json();
      if (result.status === 'error') {
        alert(`Regeneration error: ${result.topics?.[0]?.error || 'unknown'}`);
      }
    } finally {
      setRegeneratingId(null);
      fetchTopics();
    }
  }

  async function handleToggleActive(topic: BlogTopic) {
    await fetch(`/api/admin/blog-topics/${topic.id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isActive: !topic.isActive }),
    });
    fetchTopics();
  }

  async function handleToggleAutoPublish(topic: BlogTopic) {
    await fetch(`/api/admin/blog-topics/${topic.id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ autoPublish: !topic.autoPublish }),
    });
    fetchTopics();
  }

  async function handleSaveEdit() {
    if (!editing) return;
    const payload = {
      titleId: editing.titleId,
      titleEn: editing.titleEn,
      excerptId: editing.excerptId,
      excerptEn: editing.excerptEn,
      promptTemplate: editing.promptTemplate,
      category: editing.category,
      assetClass: editing.assetClass,
      targetLengthWords: editing.targetLengthWords,
      scheduledWeek: editing.scheduledWeek,
      priority: editing.priority,
    };
    await fetch(`/api/admin/blog-topics/${editing.id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    setEditing(null);
    fetchTopics();
  }

  async function handleDelete(topic: BlogTopic) {
    if (!confirm(`Delete topic "${topic.slug}"? This does NOT delete the generated article.`)) return;
    await fetch(`/api/admin/blog-topics/${topic.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    fetchTopics();
  }

  const summary = {
    total: topics.length,
    published: topics.filter((t) => t.status === 'PUBLISHED').length,
    pending: topics.filter((t) => t.status === 'PENDING').length,
    failed: topics.filter((t) => t.status === 'FAILED').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <CmsPageHeader
          title="Blog Topics"
          description="AI-generated blog content catalog. Topics are processed by the blog-article-generator worker."
          previewUrl="/research"
        />
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total topics</div>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Published</div>
            <div className="text-2xl font-bold text-green-400">{summary.published}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Pending</div>
            <div className="text-2xl font-bold text-slate-300">{summary.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Failed</div>
            <div className="text-2xl font-bold text-red-400">{summary.failed}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Status filter</label>
          <select
            value={filter.status ?? ''}
            onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
            className="border border-border rounded-md px-3 py-2 bg-background text-sm"
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="GENERATING">Generating</option>
            <option value="PUBLISHED">Published</option>
            <option value="FAILED">Failed</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Asset class</label>
          <select
            value={filter.assetClass ?? ''}
            onChange={(e) => setFilter({ ...filter, assetClass: e.target.value || undefined })}
            className="border border-border rounded-md px-3 py-2 bg-background text-sm"
          >
            <option value="">All</option>
            <option value="FOREX">Forex</option>
            <option value="CRYPTO">Crypto</option>
            <option value="MULTI">Multi-asset</option>
          </select>
        </div>
        <Button variant="outline" size="sm" onClick={() => setFilter({})}>
          Clear filters
        </Button>
      </div>

      {editing && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle>Edit topic — {editing.slug}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Title (ID)</label>
                <Input
                  value={editing.titleId}
                  onChange={(e) => setEditing({ ...editing, titleId: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Title (EN)</label>
                <Input
                  value={editing.titleEn}
                  onChange={(e) => setEditing({ ...editing, titleEn: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Excerpt (ID)</label>
              <Textarea
                value={editing.excerptId}
                onChange={(e) => setEditing({ ...editing, excerptId: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Excerpt (EN)</label>
              <Textarea
                value={editing.excerptEn}
                onChange={(e) => setEditing({ ...editing, excerptEn: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Prompt template ({editing.promptTemplate.length} chars)
              </label>
              <Textarea
                value={editing.promptTemplate}
                onChange={(e) => setEditing({ ...editing, promptTemplate: e.target.value })}
                rows={14}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use <code>{'{{DATA_JSON}}'}</code> and <code>{'{{TARGET_WORDS}}'}</code> placeholders.
              </p>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <select
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="w-full border border-border rounded-md px-3 py-2 bg-background text-sm"
                >
                  {['RESEARCH','STRATEGY','EXECUTION','RISK','OPERATIONS','MARKET_ANALYSIS','EDUCATION','CASE_STUDY','COMPLIANCE'].map(c =>
                    <option key={c} value={c}>{c}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Asset class</label>
                <select
                  value={editing.assetClass}
                  onChange={(e) => setEditing({ ...editing, assetClass: e.target.value })}
                  className="w-full border border-border rounded-md px-3 py-2 bg-background text-sm"
                >
                  {['FOREX','CRYPTO','MULTI'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Target words</label>
                <Input
                  type="number"
                  value={editing.targetLengthWords}
                  onChange={(e) => setEditing({ ...editing, targetLengthWords: parseInt(e.target.value) || 1500 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Scheduled week</label>
                <Input
                  type="number"
                  value={editing.scheduledWeek}
                  onChange={(e) => setEditing({ ...editing, scheduledWeek: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSaveEdit}>Save</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading topics...</div>
      ) : topics.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-muted-foreground">No blog topics yet.</p>
            <p className="text-sm">
              Run seed: <code className="bg-muted px-2 py-1 rounded text-xs">
                curl -H &quot;x-cron-secret: $CRON_SECRET&quot; https://babahalgo.com/api/cron/seed-blog-topics
              </code>
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {topics.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded font-mono ${STATUS_COLORS[t.status] ?? 'bg-muted'}`}>
                        {t.status}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${ASSET_CLASS_COLORS[t.assetClass] ?? 'bg-muted'}`}>
                        {t.assetClass}
                      </span>
                      <span className="text-xs text-muted-foreground">W{t.scheduledWeek}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs font-mono text-muted-foreground">{t.category}</span>
                      {t.autoPublish && (
                        <span className="text-xs text-green-400">auto-publish</span>
                      )}
                      {!t.isActive && (
                        <span className="text-xs text-red-400">inactive</span>
                      )}
                    </div>
                    <div className="font-semibold text-sm mb-1">{t.titleId}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.excerptId}</div>
                    {t.lastError && (
                      <div className="text-xs text-red-400 mt-2 font-mono bg-red-500/5 p-2 rounded border border-red-500/20">
                        {t.lastError}
                      </div>
                    )}
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Target: {t.targetLengthWords} kata</span>
                      <span>Priority: {t.priority}</span>
                      {t.lastGeneratedAt && (
                        <span>Generated: {new Date(t.lastGeneratedAt).toLocaleString('id-ID')}</span>
                      )}
                      {t.aiTokensUsed > 0 && <span>Tokens: {t.aiTokensUsed.toLocaleString()}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleRegenerate(t)}
                      disabled={regeneratingId === t.id || t.status === 'GENERATING'}
                    >
                      {regeneratingId === t.id ? 'Generating…' : 'Regenerate'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleToggleActive(t)}>
                      {t.isActive ? 'Disable' : 'Enable'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleToggleAutoPublish(t)}>
                      {t.autoPublish ? 'Manual publish' : 'Auto publish'}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(t)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
