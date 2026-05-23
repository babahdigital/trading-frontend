'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/admin/page-header';
import { vpsStatusBadge } from '@/lib/admin/badges';
import { formatDateTime } from '@/lib/format-locale';
import { cn } from '@/lib/utils';
import { Plus, RefreshCw, Server, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth/auth-context';

interface VpsInstance {
  id: string;
  name: string;
  host: string;
  port: number;
  status: string;
  lastHealthCheck: string | null;
  lastResponseTime: number | null;
  createdAt: string;
}

const defaultForm = {
  name: '',
  host: '',
  port: '8000',
  backendBaseUrl: '',
  adminToken: '',
  sshHost: '',
  sshPort: '22',
  sshUser: '',
};

export default function VpsPage() {
  const t = useTranslations('admin.vps');
  const tc = useTranslations('admin.common');
  const { getAuthHeaders } = useAuth();
  const [instances, setInstances] = useState<VpsInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchVps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/vps', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setInstances(data.instances ?? data ?? []);
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    // fetchVps drives setState — intentional fetch on mount + refetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchVps();
  }, [fetchVps]);

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/vps', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: form.name,
          host: form.host,
          port: parseInt(form.port) || 8000,
          backendBaseUrl: form.backendBaseUrl || undefined,
          adminToken: form.adminToken || undefined,
          sshHost: form.sshHost || undefined,
          sshPort: form.sshPort ? parseInt(form.sshPort) : undefined,
          sshUser: form.sshUser || undefined,
        }),
      });
      if (res.ok) {
        setForm(defaultForm);
        setShowForm(false);
        void fetchVps();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || t('error_register'));
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <>
            <Button variant="outline" size="icon" onClick={fetchVps} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {showForm ? tc('cancel') : t('register')}
            </Button>
          </>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('register_new')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name *</label>
                <Input value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="Client VPS 1" required />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Host *</label>
                <Input value={form.host} onChange={(e) => updateForm('host', e.target.value)} placeholder="192.168.1.100" required />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Port</label>
                <Input type="number" value={form.port} onChange={(e) => updateForm('port', e.target.value)} placeholder="8000" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Backend Base URL</label>
                <Input value={form.backendBaseUrl} onChange={(e) => updateForm('backendBaseUrl', e.target.value)} placeholder="https://api.example.com" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Admin Token</label>
                <Input type="password" value={form.adminToken} onChange={(e) => updateForm('adminToken', e.target.value)} placeholder="Secret token" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">SSH Host</label>
                <Input value={form.sshHost} onChange={(e) => updateForm('sshHost', e.target.value)} placeholder="192.168.1.100" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">SSH Port</label>
                <Input type="number" value={form.sshPort} onChange={(e) => updateForm('sshPort', e.target.value)} placeholder="22" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">SSH User</label>
                <Input value={form.sshUser} onChange={(e) => updateForm('sshUser', e.target.value)} placeholder="root" />
              </div>
              <div className="md:col-span-2 flex items-center gap-4">
                <Button type="submit" disabled={submitting}>
                  {submitting ? t('btn_registering') : t('register')}
                </Button>
                {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="md:overflow-x-auto">
            <table className="w-full text-sm table-responsive">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium text-muted-foreground">{t('th_name')}</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">{t('th_host')}</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">{t('th_status')}</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">{t('th_last_health')}</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">{t('th_response_time')}</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">{t('th_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td colSpan={6} className="p-4 no-label"><div className="h-6 rounded bg-muted animate-pulse" /></td>
                    </tr>
                  ))
                ) : instances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center no-label">
                      <Server className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">{t('empty')}</p>
                    </td>
                  </tr>
                ) : (
                  instances.map((vps) => {
                    const sb = vpsStatusBadge(vps.status);
                    return (
                      <tr key={vps.id} className="border-b hover:bg-accent/50 transition-colors">
                        <td className="p-4 font-medium" data-label="Name">{vps.name}</td>
                        <td className="p-4 font-mono text-xs" data-label="Host">{vps.host}:{vps.port}</td>
                        <td className="p-4" data-label="Status">
                          <span className={cn('px-2 py-1 rounded-full text-xs font-medium', sb.cls)}>
                            {sb.label}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground" data-label="Last Health">
                          {vps.lastHealthCheck ? formatDateTime(vps.lastHealthCheck) : tc('never')}
                        </td>
                        <td className="p-4 text-muted-foreground" data-label="Response Time">
                          {vps.lastResponseTime != null ? `${vps.lastResponseTime}ms` : '-'}
                        </td>
                        <td className="p-4" data-label="Actions">
                          <Button variant="ghost" size="sm">{t('btn_details')}</Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
