'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck, Crown, Wrench, UserPlus, Power, Settings, AlertCircle, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { formatRelative as formatRelativeI18n } from '@/lib/format-locale';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR';
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  createdBy: { id: string; email: string; name: string | null } | null;
}

const ROLE_META = {
  SUPER_ADMIN: { icon: Crown, label: 'Super Admin', tone: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30' },
  ADMIN: { icon: ShieldCheck, label: 'Admin', tone: 'text-[hsl(var(--primary))] bg-primary/10 border-primary/30' },
  OPERATOR: { icon: Wrench, label: 'Operator', tone: 'text-foreground bg-muted/60 border-border' },
} as const;

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  return formatRelativeI18n(iso);
}

export default function AdminTeamPage() {
  const { getAuthHeaders } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/team', { headers: getAuthHeaders() });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // load drives setState — intentional fetch on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleActive(user: TeamMember) {
    if (user.role === 'SUPER_ADMIN') return;
    const ok = await confirm({
      title: user.isActive ? 'Deaktifkan akun?' : 'Aktifkan akun?',
      description: user.email,
      confirmLabel: user.isActive ? 'Deaktifkan' : 'Aktifkan',
      tone: user.isActive ? 'warning' : 'default',
    });
    if (!ok) return;
    setBusy(user.id);
    try {
      const res = user.isActive
        ? await fetch(`/api/admin/team/${user.id}`, { method: 'DELETE', headers: getAuthHeaders() })
        : await fetch(`/api/admin/team/${user.id}`, {
            method: 'PATCH',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: true }),
          });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      toast.push({ tone: 'success', title: user.isActive ? 'Akun dinonaktifkan' : 'Akun diaktifkan' });
      await load();
    } catch (err) {
      toast.push({ tone: 'error', title: 'Gagal update', description: err instanceof Error ? err.message : 'Unknown' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tim & RBAC"
        description="Kelola super admin, admin, dan operator. Setiap perubahan tercatat di audit chain SHA-256."
        actions={
          <Button asChild className="gap-2">
            <Link href="/admin/team/new">
              <UserPlus className="h-4 w-4" strokeWidth={2.25} />
              Tambah operator / admin
            </Link>
          </Button>
        }
      />

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={2.25} />
          <span>Gagal memuat tim: {error}</span>
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden md:overflow-x-auto">
        <table className="w-full text-sm table-responsive">
          <thead className="text-[11px] uppercase text-muted-foreground bg-muted/40">
            <tr>
              <th className="text-left py-2 px-4 font-medium">Pengguna</th>
              <th className="text-left py-2 px-4 font-medium">Peran</th>
              <th className="text-left py-2 px-4 font-medium">Permissions</th>
              <th className="text-left py-2 px-4 font-medium">Login Terakhir</th>
              <th className="text-left py-2 px-4 font-medium">Dibuat oleh</th>
              <th className="text-right py-2 px-4 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="py-3 px-4 no-label"><div className="h-6 rounded bg-muted animate-pulse" /></td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 no-label">
                  <EmptyState
                    variant="inline"
                    icon={Users}
                    title="Belum ada admin/operator"
                    description="Tambahkan anggota tim pertama untuk mulai mengelola platform."
                  />
                </td>
              </tr>
            ) : users.map((u) => {
              const roleMeta = ROLE_META[u.role];
              const Icon = roleMeta.icon;
              const permsCount = Array.isArray(u.permissions) ? u.permissions.length : 0;
              return (
                <tr key={u.id} className={cn('hover:bg-muted/30 transition-colors', !u.isActive && 'opacity-60')}>
                  <td className="py-3 px-4" data-label="Pengguna">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{u.name || u.email}</span>
                      {u.name && <span className="text-xs text-muted-foreground">{u.email}</span>}
                      {!u.isActive && <span className="text-[10px] uppercase tracking-wider text-destructive mt-0.5">Nonaktif</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4" data-label="Peran">
                    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium', roleMeta.tone)}>
                      <Icon className="h-3 w-3" strokeWidth={2.5} />
                      {roleMeta.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground" data-label="Permissions">
                    {u.role === 'SUPER_ADMIN'
                      ? 'Semua (bypass)'
                      : u.role === 'ADMIN' && permsCount === 0
                        ? 'Penuh (legacy)'
                        : permsCount === 0
                          ? <span className="text-destructive">Tidak ada</span>
                          : `${permsCount} permission`}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground" data-label="Login Terakhir">{formatRelative(u.lastLoginAt)}</td>
                  <td className="py-3 px-4 text-muted-foreground text-xs" data-label="Dibuat oleh">
                    {u.createdBy ? (u.createdBy.name || u.createdBy.email) : '— bootstrap'}
                  </td>
                  <td className="py-3 px-4 text-right" data-label="Aksi">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={u.role === 'SUPER_ADMIN'}
                        title="Edit permissions (Wave-30)"
                        aria-label="Edit permissions (Wave-30)"
                      >
                        <Settings className="h-3.5 w-3.5" strokeWidth={2.25} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={u.role === 'SUPER_ADMIN' || busy === u.id}
                        onClick={() => toggleActive(u)}
                        title={u.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN immutable' : (u.isActive ? 'Nonaktifkan akun' : 'Aktifkan akun')}
                        aria-label={u.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN immutable' : (u.isActive ? 'Nonaktifkan akun' : 'Aktifkan akun')}
                      >
                        <Power className={cn('h-3.5 w-3.5', !u.isActive && 'text-destructive')} strokeWidth={2.25} />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
        <h3 className="font-semibold text-foreground mb-2">Catatan keamanan RBAC</h3>
        <ul className="space-y-1.5 text-muted-foreground text-xs leading-relaxed list-disc ml-4">
          <li>Hanya <strong className="text-foreground">SUPER_ADMIN</strong> bisa membuat akun baru. Akun ini di-bootstrap via DB SQL, tidak via UI.</li>
          <li>Permission preset di halaman create memberikan bundle siap pakai (Support, Ops, Editor, Publisher, Admin Penuh).</li>
          <li>Kombinasi role + permissions menentukan akses: <code className="font-mono text-[10px] bg-muted px-1 rounded">ADMIN + permissions kosong = legacy full-access</code> (back-compat). Operator <strong>wajib</strong> punya permission eksplisit.</li>
          <li>Deaktivasi = soft-delete (set <code className="font-mono text-[10px] bg-muted px-1 rounded">isActive=false</code> + clear sessions). Audit trail dipertahankan.</li>
          <li>Customer / portal user (role <code className="font-mono text-[10px] bg-muted px-1 rounded">CLIENT</code>) dikelola di halaman terpisah <Link href="/admin/users" className="underline hover:text-foreground">/admin/users</Link>.</li>
        </ul>
      </div>
    </div>
  );
}
