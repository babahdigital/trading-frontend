'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, AlertCircle, Check, Copy, Eye, EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { PERMISSION_GROUPS, PERMISSION_PRESETS, type Permission } from '@/lib/auth/permissions';

interface CreateResponse {
  user: { id: string; email: string; role: string };
  initialPassword: string;
}

export default function AdminUserCreatePage() {
  const { getAuthHeaders } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'OPERATOR'>('OPERATOR');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [presetId, setPresetId] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<CreateResponse | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  function applyPreset(id: string) {
    setPresetId(id);
    const preset = PERMISSION_PRESETS[id];
    if (preset) setPermissions(preset.permissions);
  }

  function togglePerm(p: Permission, on: boolean) {
    setPresetId('');
    setPermissions((prev) => (on ? [...prev, p] : prev.filter((x) => x !== p)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (role === 'OPERATOR' && permissions.length === 0) {
      setError('Operator wajib punya minimal 1 permission. Pilih preset atau centang manual.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim() || undefined,
          role,
          permissions,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setCreated(body as CreateResponse);
      toast.push({ tone: 'success', title: 'Akun berhasil dibuat', description: 'Salin password awal & kirim via channel aman.' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat akun');
    } finally {
      setSubmitting(false);
    }
  }

  function copyPassword() {
    if (!created) return;
    navigator.clipboard?.writeText(created.initialPassword).then(() => {
      toast.push({ tone: 'success', title: 'Password disalin' });
    });
  }

  // Success state — show password ONCE
  if (created) {
    return (
      <div className="max-w-2xl space-y-6">
        <Link href="/admin/team" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
          Kembali ke daftar
        </Link>

        <div className="rounded-lg border border-[hsl(var(--profit))]/30 bg-[hsl(var(--profit))]/[0.06] p-5">
          <div className="flex items-center gap-2 text-[hsl(var(--profit))] font-semibold mb-2">
            <Check className="h-5 w-5" strokeWidth={2.5} />
            Akun {created.user.email} berhasil dibuat
          </div>
          <p className="text-sm text-foreground/85">
            Berikut password awal. <strong>Password ini hanya ditampilkan SEKALI.</strong> Salin dan kirim ke
            penerima via channel aman (Telegram, Signal, atau face-to-face). Mereka diharapkan
            ganti password setelah login pertama.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <label className="t-eyebrow block">Password awal</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2.5 bg-muted/60 border border-border rounded-md font-mono text-sm break-all">
              {showPassword ? created.initialPassword : '•'.repeat(created.initialPassword.length)}
            </code>
            <Button type="button" variant="outline" size="icon" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Sembunyikan' : 'Tampilkan'}>
              {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={2.25} /> : <Eye className="h-4 w-4" strokeWidth={2.25} />}
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={copyPassword} aria-label="Salin password">
              <Copy className="h-4 w-4" strokeWidth={2.25} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Email: <span className="font-mono text-foreground">{created.user.email}</span>
            {' · '}
            Role: <span className="font-mono text-foreground">{created.user.role}</span>
            {' · '}
            Login URL: <Link href="/admin/login" className="font-mono text-[hsl(var(--primary))] underline">/admin/login</Link>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin/team">
            <Button variant="outline">Kembali ke daftar</Button>
          </Link>
          <Button onClick={() => { setCreated(null); setEmail(''); setName(''); setPermissions([]); setPresetId(''); }}>
            Buat akun lain
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/team" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
        Kembali ke daftar tim
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tambah operator atau admin</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hanya SUPER_ADMIN yang bisa create akun baru. Setelah submit, sistem generate password awal yang
          ditampilkan SEKALI — salin dan kirim ke penerima via channel aman.
        </p>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={2.25} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-7">
        {/* Identitas */}
        <div className="rounded-lg border border-border p-5 space-y-4">
          <h2 className="font-semibold text-foreground">Identitas</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="user-email" className="t-eyebrow mb-2 block">Email</label>
              <Input id="user-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ops@babahalgo.com" autoComplete="off" />
            </div>
            <div>
              <label htmlFor="user-name" className="t-eyebrow mb-2 block">Nama (opsional)</label>
              <Input id="user-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Budi" autoComplete="off" />
            </div>
          </div>
        </div>

        {/* Role */}
        <div className="rounded-lg border border-border p-5 space-y-4">
          <h2 className="font-semibold text-foreground">Peran</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <RoleCard
              active={role === 'OPERATOR'}
              onClick={() => setRole('OPERATOR')}
              title="OPERATOR"
              desc="Akses scoped — wajib punya permissions eksplisit. Cocok untuk support agent, content editor, marketing manager."
            />
            <RoleCard
              active={role === 'ADMIN'}
              onClick={() => setRole('ADMIN')}
              title="ADMIN"
              desc="Akses luas. Permissions kosong = legacy full-access (kecuali user-management). Cocok untuk co-founder atau senior ops."
            />
          </div>
        </div>

        {/* Preset */}
        <div className="rounded-lg border border-border p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-foreground mb-1">Preset permission (opsional)</h2>
            <p className="text-xs text-muted-foreground">
              Pilih bundle siap pakai sebagai starting point — Anda bisa tweak manual setelahnya.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(PERMISSION_PRESETS).map(([id, preset]) => (
              <button
                key={id}
                type="button"
                onClick={() => applyPreset(id)}
                className={cn(
                  'inline-flex items-start justify-between gap-2 px-3 py-2.5 rounded-md text-left text-sm border transition-colors',
                  presetId === id
                    ? 'border-primary bg-primary/[0.08] text-foreground'
                    : 'border-border hover:bg-muted/40',
                )}
              >
                <span>
                  <span className="block font-medium">{preset.labelId}</span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">{preset.permissions.length} permission</span>
                </span>
                {presetId === id ? <Check className="h-3.5 w-3.5 text-[hsl(var(--primary))] shrink-0" strokeWidth={2.5} /> : null}
              </button>
            ))}
          </div>
        </div>

        {/* Permissions checkbox grid */}
        <div className="rounded-lg border border-border p-5 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-foreground mb-1">Permissions</h2>
              <p className="text-xs text-muted-foreground">
                {permissions.length > 0
                  ? `${permissions.length} permission dipilih.`
                  : 'Belum ada permission dipilih. Operator wajib punya minimal 1.'}
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setPermissions([]); setPresetId(''); }} disabled={permissions.length === 0}>
              Reset
            </Button>
          </div>

          {PERMISSION_GROUPS.map((group) => (
            <div key={group.id} className="space-y-2">
              <div>
                <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{group.labelId}</h3>
                {group.descId ? <p className="text-[11px] text-muted-foreground/80 mt-0.5">{group.descId}</p> : null}
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {group.permissions.map((perm) => {
                  const checked = permissions.includes(perm.key);
                  const id = `perm-${perm.key}`;
                  return (
                    <label
                      key={perm.key}
                      htmlFor={id}
                      className={cn(
                        'flex items-start gap-3 px-3 py-2.5 rounded-md border cursor-pointer transition-colors',
                        checked ? 'border-primary/40 bg-primary/[0.05]' : 'border-border hover:bg-muted/30',
                      )}
                    >
                      <input
                        id={id}
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => togglePerm(perm.key, e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-border accent-[hsl(var(--primary))]"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-foreground">{perm.labelId}</span>
                        <span className="block text-[11px] text-muted-foreground mt-0.5 leading-snug">{perm.descId}</span>
                        <span className="block font-mono text-[10px] text-muted-foreground/70 mt-0.5">{perm.key}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin/team">
            <Button type="button" variant="outline">Batal</Button>
          </Link>
          <Button type="submit" disabled={submitting} className="gap-2">
            {submitting ? 'Membuat akun…' : 'Buat akun'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function RoleCard({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-left px-4 py-3 rounded-md border transition-colors',
        active ? 'border-primary bg-primary/[0.08]' : 'border-border hover:bg-muted/40',
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-sm font-semibold text-foreground">{title}</span>
        {active ? <Check className="h-4 w-4 text-[hsl(var(--primary))]" strokeWidth={2.5} /> : null}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </button>
  );
}
