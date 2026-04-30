'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck, Crown, Wrench, UserPlus, Power, Settings, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/toast';
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
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return 'hari ini';
  if (days < 7) return `${days}h lalu`;
  if (days < 30) return `${Math.floor(days / 7)}m lalu`;
  return d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminTeamPage() {
  const { getAuthHeaders } = useAuth();
  const toast = useToast();
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleActive(user: TeamMember) {
    if (user.role === 'SUPER_ADMIN') return;
    if (!confirm(user.isActive ? `Deaktifkan ${user.email}?` : `Aktifkan ${user.email}?`)) return;
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tim & RBAC</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola super admin, admin, dan operator. Setiap perubahan tercatat di audit chain SHA-256.
          </p>
        </div>
        <Link href="/admin/team/new">
          <Button className="gap-2">
            <UserPlus className="h-4 w-4" strokeWidth={2.25} />
            Tambah operator / admin
          </Button>
        </Link>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={2.25} />
          <span>Gagal memuat tim: {error}</span>
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
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
              <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Memuat tim…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Belum ada admin/operator.</td></tr>
            ) : users.map((u) => {
              const roleMeta = ROLE_META[u.role];
              const Icon = roleMeta.icon;
              const permsCount = Array.isArray(u.permissions) ? u.permissions.length : 0;
              return (
                <tr key={u.id} className={cn('hover:bg-muted/30 transition-colors', !u.isActive && 'opacity-60')}>
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{u.name || u.email}</span>
                      {u.name && <span className="text-xs text-muted-foreground">{u.email}</span>}
                      {!u.isActive && <span className="text-[10px] uppercase tracking-wider text-destructive mt-0.5">Nonaktif</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium', roleMeta.tone)}>
                      <Icon className="h-3 w-3" strokeWidth={2.5} />
                      {roleMeta.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {u.role === 'SUPER_ADMIN'
                      ? 'Semua (bypass)'
                      : u.role === 'ADMIN' && permsCount === 0
                        ? 'Penuh (legacy)'
                        : permsCount === 0
                          ? <span className="text-destructive">Tidak ada</span>
                          : `${permsCount} permission`}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{formatRelative(u.lastLoginAt)}</td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">
                    {u.createdBy ? (u.createdBy.name || u.createdBy.email) : '— bootstrap'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button variant="ghost" size="sm" disabled={u.role === 'SUPER_ADMIN'} title="Edit permissions (Wave-30)">
                        <Settings className="h-3.5 w-3.5" strokeWidth={2.25} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={u.role === 'SUPER_ADMIN' || busy === u.id}
                        onClick={() => toggleActive(u)}
                        title={u.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN immutable' : (u.isActive ? 'Nonaktifkan' : 'Aktifkan')}
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
