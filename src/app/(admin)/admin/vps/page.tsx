'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Plus, RefreshCw, Server, X } from 'lucide-react';

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

const statusBadge: Record<string, string> = {
  ONLINE: 'bg-green-500/20 text-green-400',
  OFFLINE: 'bg-red-500/20 text-red-400',
  PROVISIONING: 'bg-yellow-500/20 text-yellow-400',
  SUSPENDED: 'bg-orange-500/20 text-orange-400',
};

function authHeaders(json = false) {
  const h: Record<string, string> = {
    Authorization: `Bearer ${localStorage.getItem('access_token')}`,
  };
  if (json) h['Content-Type'] = 'application/json';
  return h;
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
  const [instances, setInstances] = useState<VpsInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function fetchVps() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/vps', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setInstances(data.instances ?? data ?? []);
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchVps(); }, []);

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
        headers: authHeaders(true),
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
        fetchVps();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to register VPS');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">VPS Instances</h2>
          <p className="text-muted-foreground">Manage client VPS deployments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchVps} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {showForm ? 'Cancel' : 'Register VPS'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Register New VPS</CardTitle>
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
                  {submitting ? 'Registering...' : 'Register VPS'}
                </Button>
                {error && <p className="text-sm text-red-400">{error}</p>}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Host</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Last Health</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Response Time</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Loading...</td></tr>
                ) : instances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center">
                      <Server className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No VPS instances registered. Click &quot;Register VPS&quot; to add one.</p>
                    </td>
                  </tr>
                ) : (
                  instances.map((vps) => (
                    <tr key={vps.id} className="border-b hover:bg-accent/50 transition-colors">
                      <td className="p-4 font-medium">{vps.name}</td>
                      <td className="p-4 font-mono text-xs">{vps.host}:{vps.port}</td>
                      <td className="p-4">
                        <span className={cn('px-2 py-1 rounded-full text-xs font-medium', statusBadge[vps.status] || 'bg-gray-500/20 text-gray-400')}>
                          {vps.status}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {vps.lastHealthCheck ? new Date(vps.lastHealthCheck).toLocaleString() : 'Never'}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {vps.lastResponseTime != null ? `${vps.lastResponseTime}ms` : '-'}
                      </td>
                      <td className="p-4">
                        <Button variant="ghost" size="sm">Details</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
