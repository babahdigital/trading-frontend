'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Trash2, Power, Users as UsersIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { activeBadge, userRoleBadge } from '@/lib/admin/badges';
import { formatDateTime } from '@/lib/format-locale';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  mt5Account: string | null;
  isActive?: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  _count: { licenses: number; subscriptions: number };
}

const ROLE_OPTIONS = [
  { value: 'CLIENT', label: 'CLIENT' },
  { value: 'OPERATOR', label: 'OPERATOR' },
  { value: 'ADMIN', label: 'ADMIN' },
  { value: 'SUPER_ADMIN', label: 'SUPER ADMIN' },
];

export default function UsersPage() {
  const { getAuthHeaders } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'CLIENT',
    mt5Account: '',
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name || undefined,
          role: form.role,
          mt5Account: form.mt5Account || undefined,
        }),
      });
      if (res.ok) {
        setForm({ email: '', password: '', name: '', role: 'CLIENT', mt5Account: '' });
        setShowForm(false);
        void fetchUsers();
        toast.push({ tone: 'success', title: 'User dibuat', description: form.email });
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Gagal membuat user');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(user: User) {
    const ok = await confirm({
      title: `Hapus user ${user.email}?`,
      description: 'Tindakan ini tidak bisa dibatalkan. Semua license user akan ikut terhapus. Hanya user dengan role CLIENT yang bisa dihapus.',
      confirmLabel: 'Hapus',
      cancelLabel: 'Batal',
      tone: 'destructive',
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        void fetchUsers();
        toast.push({ tone: 'success', title: 'User dihapus', description: user.email });
      } else {
        const data = await res.json().catch(() => ({}));
        toast.push({ tone: 'error', title: 'Hapus gagal', description: data.error || res.statusText });
      }
    } catch (err) {
      toast.push({ tone: 'error', title: 'Network error', description: err instanceof Error ? err.message : 'unknown' });
    }
  }

  async function handleChangeRole(user: User, newRole: string) {
    if (newRole === user.role) return;
    const ok = await confirm({
      title: 'Ubah role user?',
      description: `${user.email}\nDari: ${user.role} → ${newRole}`,
      confirmLabel: 'Ubah role',
      tone: 'warning',
    });
    if (!ok) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: user.id, role: newRole }),
      });
      if (res.ok) {
        void fetchUsers();
        toast.push({ tone: 'success', title: 'Role diubah', description: `${user.email} → ${newRole}` });
      } else {
        const data = await res.json().catch(() => ({}));
        toast.push({ tone: 'error', title: 'Gagal ubah role', description: data.error || res.statusText });
      }
    } catch (err) {
      toast.push({ tone: 'error', title: 'Network error', description: err instanceof Error ? err.message : 'unknown' });
    }
  }

  async function handleToggleActive(user: User) {
    const next = !(user.isActive ?? true);
    const action = next ? 'Reaktivasi' : 'Nonaktifkan';
    const ok = await confirm({
      title: `${action} user?`,
      description: user.email,
      confirmLabel: action,
      tone: next ? 'default' : 'warning',
    });
    if (!ok) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: user.id, isActive: next }),
      });
      if (res.ok) {
        void fetchUsers();
        toast.push({ tone: 'success', title: next ? 'User diaktifkan' : 'User dinonaktifkan' });
      } else {
        const data = await res.json().catch(() => ({}));
        toast.push({ tone: 'error', title: 'Gagal', description: data.error || res.statusText });
      }
    } catch (err) {
      toast.push({ tone: 'error', title: 'Network error', description: err instanceof Error ? err.message : 'unknown' });
    }
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description={`${total} pengguna terdaftar`}
        actions={
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {showForm ? 'Batal' : 'Tambah User'}
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Buat User Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="new-user-email" className="text-sm font-medium text-muted-foreground">Email *</label>
                <Input id="new-user-email" type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} placeholder="user@example.com" required />
              </div>
              <div>
                <label htmlFor="new-user-password" className="text-sm font-medium text-muted-foreground">Password *</label>
                <Input id="new-user-password" type="password" value={form.password} onChange={(e) => updateForm('password', e.target.value)} placeholder="Min 8 karakter" required minLength={8} />
              </div>
              <div>
                <label htmlFor="new-user-name" className="text-sm font-medium text-muted-foreground">Nama</label>
                <Input id="new-user-name" value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="Nama lengkap" />
              </div>
              <div>
                <label htmlFor="new-user-role" className="text-sm font-medium text-muted-foreground">Role *</label>
                <select
                  id="new-user-role"
                  value={form.role}
                  onChange={(e) => updateForm('role', e.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {ROLE_OPTIONS.filter(r => r.value !== 'SUPER_ADMIN').map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="new-user-mt5" className="text-sm font-medium text-muted-foreground">MT5 Account</label>
                <Input id="new-user-mt5" value={form.mt5Account} onChange={(e) => updateForm('mt5Account', e.target.value)} placeholder="Nomor akun MT5" />
              </div>
              <div className="sm:col-span-2 flex items-center gap-4 flex-wrap">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Membuat...' : 'Buat User'}
                </Button>
                {error && <p className="text-sm text-rose-500 dark:text-rose-400" role="alert">{error}</p>}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {/* Desktop table (md+) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium text-muted-foreground">Nama</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">MT5</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Lisensi</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Login Terakhir</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={`skl-${i}`} className="border-b">
                      <td colSpan={8} className="p-3">
                        <div className="h-8 rounded bg-muted animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6">
                      <EmptyState
                        variant="inline"
                        icon={UsersIcon}
                        title="Belum ada user"
                        description="Tambahkan user baru untuk mulai onboard pelanggan atau operator."
                        actions={[{ label: 'Tambah User', onClick: () => setShowForm(true), icon: Plus }]}
                      />
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const isActive = user.isActive ?? true;
                    const isSuperAdmin = user.role === 'SUPER_ADMIN';
                    const roleMeta = userRoleBadge(user.role);
                    const statusMeta = activeBadge(isActive);
                    return (
                      <tr key={user.id} className="border-b hover:bg-accent/50 transition-colors">
                        <td className="p-4 font-medium">{user.name || '-'}</td>
                        <td className="p-4">{user.email}</td>
                        <td className="p-4">
                          <select
                            value={user.role}
                            disabled={isSuperAdmin}
                            onChange={(e) => handleChangeRole(user, e.target.value)}
                            aria-label={`Ubah role ${user.email}`}
                            className={cn(
                              'px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer disabled:cursor-not-allowed',
                              roleMeta.cls,
                            )}
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r.value} value={r.value} disabled={r.value === 'SUPER_ADMIN' && !isSuperAdmin}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-4">
                          <span className={cn('px-2 py-1 rounded-full text-xs font-medium', statusMeta.cls)}>
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-xs">{user.mt5Account || '-'}</td>
                        <td className="p-4">{user._count.licenses}</td>
                        <td className="p-4 text-muted-foreground">
                          {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Belum pernah'}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(user)}
                              disabled={isSuperAdmin}
                              title={isActive ? 'Nonaktifkan user' : 'Aktifkan kembali user'}
                              aria-label={isActive ? 'Nonaktifkan user' : 'Aktifkan kembali user'}
                              className="p-1.5 rounded hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Power className={cn('h-4 w-4', isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(user)}
                              disabled={user.role !== 'CLIENT'}
                              title={user.role === 'CLIENT' ? 'Hapus user' : 'Hanya CLIENT yang bisa dihapus'}
                              aria-label={user.role === 'CLIENT' ? 'Hapus user' : 'Hanya CLIENT yang bisa dihapus'}
                              className="p-1.5 rounded hover:bg-rose-500/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile card stack (<md) */}
          <ul className="md:hidden divide-y divide-border" aria-label="Daftar user">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <li key={`mskl-${i}`} className="p-4">
                  <div className="h-16 rounded bg-muted animate-pulse" />
                </li>
              ))
            ) : users.length === 0 ? (
              <li className="p-4">
                <EmptyState
                  variant="inline"
                  icon={UsersIcon}
                  title="Belum ada user"
                  description="Tambahkan user baru untuk mulai onboard pelanggan."
                  actions={[{ label: 'Tambah User', onClick: () => setShowForm(true), icon: Plus }]}
                />
              </li>
            ) : (
              users.map((user) => {
                const isActive = user.isActive ?? true;
                const isSuperAdmin = user.role === 'SUPER_ADMIN';
                const roleMeta = userRoleBadge(user.role);
                const statusMeta = activeBadge(isActive);
                return (
                  <li key={user.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm break-words">{user.name || '-'}</div>
                        <div className="text-xs text-muted-foreground break-all">{user.email}</div>
                      </div>
                      <span className={cn('shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider', roleMeta.cls)}>
                        {roleMeta.label}
                      </span>
                    </div>
                    <dl className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <dt className="text-muted-foreground/70 text-[10px] uppercase tracking-wider">Status</dt>
                        <dd className="mt-0.5">
                          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', statusMeta.cls)}>
                            {statusMeta.label}
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground/70 text-[10px] uppercase tracking-wider">Lisensi</dt>
                        <dd className="font-medium mt-0.5">{user._count.licenses}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground/70 text-[10px] uppercase tracking-wider">Login</dt>
                        <dd className="mt-0.5 text-muted-foreground truncate">
                          {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Belum pernah'}
                        </dd>
                      </div>
                    </dl>
                    <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                      <select
                        value={user.role}
                        disabled={isSuperAdmin}
                        onChange={(e) => handleChangeRole(user, e.target.value)}
                        aria-label={`Ubah role ${user.email}`}
                        className="flex-1 h-8 px-2 rounded border border-input bg-background text-xs disabled:opacity-50"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value} disabled={r.value === 'SUPER_ADMIN' && !isSuperAdmin}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(user)}
                        disabled={isSuperAdmin}
                        title={isActive ? 'Nonaktifkan user' : 'Aktifkan kembali user'}
                        aria-label={isActive ? 'Nonaktifkan user' : 'Aktifkan kembali user'}
                        className="p-1.5 rounded hover:bg-accent transition-colors disabled:opacity-30"
                      >
                        <Power className={cn('h-4 w-4', isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(user)}
                        disabled={user.role !== 'CLIENT'}
                        title={user.role === 'CLIENT' ? 'Hapus user' : 'Hanya CLIENT yang bisa dihapus'}
                        aria-label={user.role === 'CLIENT' ? 'Hapus user' : 'Hanya CLIENT yang bisa dihapus'}
                        className="p-1.5 rounded hover:bg-rose-500/15 transition-colors disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
