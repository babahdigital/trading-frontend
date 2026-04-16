'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Plus, X } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';

interface License {
  id: string;
  licenseKey: string;
  type: string;
  status: string;
  startsAt: string;
  expiresAt: string;
  user: { id: string; email: string; name: string | null };
  vpsInstance: { id: string; name: string; status: string } | null;
  createdAt: string;
}

interface UserOption {
  id: string;
  email: string;
  name: string | null;
}

interface VpsOption {
  id: string;
  name: string;
}

const statusColor: Record<string, string> = {
  ACTIVE: 'bg-green-500/20 text-green-400',
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  EXPIRED: 'bg-red-500/20 text-red-400',
  REVOKED: 'bg-red-700/20 text-red-500',
  SUSPENDED: 'bg-orange-500/20 text-orange-400',
};

const LICENSE_TYPES = ['VPS_INSTALLATION', 'PAMM_SUBSCRIBER', 'SIGNAL_SUBSCRIBER'];

type FilterType = 'ALL' | 'ACTIVE' | 'EXPIRED' | 'PENDING';

export default function LicensesPage() {
  const { getAuthHeaders } = useAuth();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [vpsList, setVpsList] = useState<VpsOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    userId: '',
    type: LICENSE_TYPES[0],
    startsAt: '',
    expiresAt: '',
    vpsInstanceId: '',
  });

  async function fetchLicenses() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/licenses', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setLicenses(data.licenses ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }

  async function fetchFormOptions() {
    try {
      const [usersRes, vpsRes] = await Promise.all([
        fetch('/api/admin/users', { headers: getAuthHeaders() }),
        fetch('/api/admin/vps', { headers: getAuthHeaders() }),
      ]);
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers((data.users ?? []).map((u: UserOption) => ({ id: u.id, email: u.email, name: u.name })));
      }
      if (vpsRes.ok) {
        const data = await vpsRes.json();
        const list = data.instances ?? data ?? [];
        setVpsList(list.map((v: VpsOption) => ({ id: v.id, name: v.name })));
      }
    } catch {
      // handled
    }
  }

  useEffect(() => { fetchLicenses(); }, []);

  useEffect(() => {
    if (showForm) fetchFormOptions();
  }, [showForm]);

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          userId: form.userId,
          type: form.type,
          startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
          vpsInstanceId: form.vpsInstanceId || undefined,
        }),
      });
      if (res.ok) {
        setForm({ userId: '', type: LICENSE_TYPES[0], startsAt: '', expiresAt: '', vpsInstanceId: '' });
        setShowForm(false);
        fetchLicenses();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to generate license');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = filter === 'ALL' ? licenses : licenses.filter((l) => l.status === filter);

  const filters: FilterType[] = ['ALL', 'ACTIVE', 'EXPIRED', 'PENDING'];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Licenses</h2>
          <p className="text-muted-foreground">{total} total licenses</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? 'Cancel' : 'Generate License'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Generate New License</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">User *</label>
                <select
                  value={form.userId}
                  onChange={(e) => updateForm('userId', e.target.value)}
                  required
                  aria-label="User"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select user...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Type *</label>
                <select
                  value={form.type}
                  onChange={(e) => updateForm('type', e.target.value)}
                  required
                  aria-label="License type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {LICENSE_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Starts At *</label>
                <Input type="date" value={form.startsAt} onChange={(e) => updateForm('startsAt', e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Expires At *</label>
                <Input type="date" value={form.expiresAt} onChange={(e) => updateForm('expiresAt', e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">VPS Instance (optional)</label>
                <select
                  value={form.vpsInstanceId}
                  onChange={(e) => updateForm('vpsInstanceId', e.target.value)}
                  aria-label="VPS Instance"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">None</option>
                  {vpsList.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex items-center gap-4">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Generating...' : 'Generate License'}
                </Button>
                {error && <p className="text-sm text-red-400">{error}</p>}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium text-muted-foreground">License Key</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Client</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Expires</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">VPS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">
                    {filter === 'ALL' ? 'No licenses yet. Generate your first license.' : `No ${filter.toLowerCase()} licenses.`}
                  </td></tr>
                ) : (
                  filtered.map((lic) => (
                    <tr key={lic.id} className="border-b hover:bg-accent/50 transition-colors">
                      <td className="p-4 font-mono text-xs">{lic.licenseKey}</td>
                      <td className="p-4">{lic.type.replace(/_/g, ' ')}</td>
                      <td className="p-4">{lic.user.name || lic.user.email}</td>
                      <td className="p-4">
                        <span className={cn('px-2 py-1 rounded-full text-xs font-medium', statusColor[lic.status] || '')}>
                          {lic.status}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">{new Date(lic.expiresAt).toLocaleDateString()}</td>
                      <td className="p-4">{lic.vpsInstance?.name || '-'}</td>
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
