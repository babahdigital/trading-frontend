'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Plus, X, KeyRound } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/admin/page-header';
import { FilterBar } from '@/components/admin/filter-bar';
import { EmptyState } from '@/components/admin/empty-state';
import { licenseStatusBadge } from '@/lib/admin/badges';
import { formatDate } from '@/lib/format-locale';

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

const LICENSE_TYPES = ['VPS_INSTALLATION', 'PAMM_SUBSCRIBER', 'SIGNAL_SUBSCRIBER'];

type FilterType = 'ALL' | 'ACTIVE' | 'EXPIRED' | 'PENDING';

export default function LicensesPage() {
  const { getAuthHeaders } = useAuth();
  const toast = useToast();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [search, setSearch] = useState('');
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

  const fetchLicenses = useCallback(async () => {
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
  }, [getAuthHeaders]);

  const fetchFormOptions = useCallback(async () => {
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
  }, [getAuthHeaders]);

  useEffect(() => {
    // fetchLicenses drives setState — intentional fetch on mount + refetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLicenses();
  }, [fetchLicenses]);

  useEffect(() => {
    // fetchFormOptions drives setState — intentional fetch saat modal terbuka.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (showForm) void fetchFormOptions();
  }, [showForm, fetchFormOptions]);

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
        void fetchLicenses();
        toast.push({ tone: 'success', title: 'Lisensi berhasil dibuat' });
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Gagal membuat lisensi');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = licenses
    .filter((l) => filter === 'ALL' || l.status === filter)
    .filter((l) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        l.licenseKey.toLowerCase().includes(q) ||
        l.user.email.toLowerCase().includes(q) ||
        (l.user.name || '').toLowerCase().includes(q) ||
        (l.vpsInstance?.name || '').toLowerCase().includes(q)
      );
    });

  const filterOptions = [
    { value: 'ALL' as const, label: 'Semua', count: licenses.length },
    { value: 'ACTIVE' as const, label: 'Aktif', count: licenses.filter(l => l.status === 'ACTIVE').length },
    { value: 'EXPIRED' as const, label: 'Kedaluwarsa', count: licenses.filter(l => l.status === 'EXPIRED').length },
    { value: 'PENDING' as const, label: 'Menunggu', count: licenses.filter(l => l.status === 'PENDING').length },
  ];

  return (
    <div>
      <PageHeader
        title="Licenses"
        description={`${total} total lisensi`}
        actions={
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {showForm ? 'Batal' : 'Generate Lisensi'}
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Generate Lisensi Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="lic-user" className="text-sm font-medium text-muted-foreground">User *</label>
                <select
                  id="lic-user"
                  value={form.userId}
                  onChange={(e) => updateForm('userId', e.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Pilih user…</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="lic-type" className="text-sm font-medium text-muted-foreground">Tipe *</label>
                <select
                  id="lic-type"
                  value={form.type}
                  onChange={(e) => updateForm('type', e.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {LICENSE_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="lic-start" className="text-sm font-medium text-muted-foreground">Mulai Aktif *</label>
                <Input id="lic-start" type="date" value={form.startsAt} onChange={(e) => updateForm('startsAt', e.target.value)} required />
              </div>
              <div>
                <label htmlFor="lic-exp" className="text-sm font-medium text-muted-foreground">Berakhir *</label>
                <Input id="lic-exp" type="date" value={form.expiresAt} onChange={(e) => updateForm('expiresAt', e.target.value)} required />
              </div>
              <div>
                <label htmlFor="lic-vps" className="text-sm font-medium text-muted-foreground">VPS Instance (opsional)</label>
                <select
                  id="lic-vps"
                  value={form.vpsInstanceId}
                  onChange={(e) => updateForm('vpsInstanceId', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">— Tidak ada —</option>
                  {vpsList.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 flex items-center gap-4 flex-wrap">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Memproses…' : 'Generate Lisensi'}
                </Button>
                {error && <p className="text-sm text-rose-500 dark:text-rose-400" role="alert">{error}</p>}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <FilterBar
        className="mb-4"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari key, email, atau VPS…"
        filters={filterOptions}
        activeFilter={filter}
        onFilterChange={setFilter}
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState
                variant="inline"
                icon={KeyRound}
                title={search
                  ? 'Tidak ada lisensi yang cocok'
                  : filter === 'ALL'
                    ? 'Belum ada lisensi'
                    : `Tidak ada lisensi ${filter.toLowerCase()}`}
                description={!search && filter === 'ALL' ? 'Mulai dengan generate lisensi pertama untuk customer.' : undefined}
                actions={!search && filter === 'ALL' ? [{ label: 'Generate Lisensi', onClick: () => setShowForm(true), icon: Plus }] : []}
              />
            </div>
          ) : (
            <div className="md:overflow-x-auto">
              <table className="w-full text-sm table-responsive">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium text-muted-foreground">License Key</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Tipe</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Client</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Berakhir</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">VPS</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lic) => {
                    const statusMeta = licenseStatusBadge(lic.status);
                    return (
                      <tr key={lic.id} className="border-b hover:bg-accent/50 transition-colors">
                        <td className="p-4 font-mono text-xs" data-label="License Key">{lic.licenseKey}</td>
                        <td className="p-4" data-label="Tipe">{lic.type.replace(/_/g, ' ')}</td>
                        <td className="p-4" data-label="Client">{lic.user.name || lic.user.email}</td>
                        <td className="p-4" data-label="Status">
                          <span className={cn('px-2 py-1 rounded-full text-xs font-medium', statusMeta.cls)}>
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground" data-label="Berakhir">{formatDate(lic.expiresAt)}</td>
                        <td className="p-4" data-label="VPS">{lic.vpsInstance?.name || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
