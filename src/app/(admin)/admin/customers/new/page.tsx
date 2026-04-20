'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { ArrowLeft, Check, ChevronRight, KeyRound, Server, User } from 'lucide-react';

const STEPS = [
  { label: 'Buat Akun', icon: User },
  { label: 'Buat License', icon: KeyRound },
  { label: 'Register VPS', icon: Server },
  { label: 'Selesai', icon: Check },
];

interface CreatedUser { id: string; email: string; name: string | null }
interface CreatedLicense { id: string; licenseKey: string; type: string; expiresAt: string }
interface CreatedVps { id: string; name: string; host: string }

export default function NewCustomerPage() {
  const { getAuthHeaders } = useAuth();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Step 1: User
  const [userForm, setUserForm] = useState({ email: '', password: '', name: '', mt5Account: '' });
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);

  // Step 2: License
  const [licenseForm, setLicenseForm] = useState({
    type: 'VPS_INSTALLATION',
    startsAt: new Date().toISOString().split('T')[0],
    expiresAt: '',
    autoRenew: false,
  });
  const [createdLicense, setCreatedLicense] = useState<CreatedLicense | null>(null);

  // Step 3: VPS
  const [vpsForm, setVpsForm] = useState({ name: '', host: '', port: '8000', backendBaseUrl: '', adminToken: '' });
  const [createdVps, setCreatedVps] = useState<CreatedVps | null>(null);

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          email: userForm.email,
          password: userForm.password,
          name: userForm.name || undefined,
          role: 'CLIENT',
          mt5Account: userForm.mt5Account || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat akun');
      setCreatedUser({ id: data.id, email: data.email, name: data.name });
      setStep(1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    if (!createdUser) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          userId: createdUser.id,
          type: licenseForm.type,
          startsAt: licenseForm.startsAt,
          expiresAt: licenseForm.expiresAt,
          autoRenew: licenseForm.autoRenew,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat license');
      setCreatedLicense({ id: data.id, licenseKey: data.licenseKey, type: data.type, expiresAt: data.expiresAt });
      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStep3(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/vps', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: vpsForm.name,
          host: vpsForm.host,
          port: parseInt(vpsForm.port) || 8000,
          backendBaseUrl: vpsForm.backendBaseUrl,
          adminToken: vpsForm.adminToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal register VPS');
      setCreatedVps({ id: data.id, name: data.name, host: data.host });

      // Link license to VPS if both exist
      if (createdLicense) {
        await fetch('/api/admin/licenses', {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ id: createdLicense.id, vpsInstanceId: data.id }),
        }).catch(() => { /* best effort */ });
      }

      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/customers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tambah Customer</h2>
          <p className="text-muted-foreground">Wizard provisioning customer baru</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center">
            <div className={cn(
              'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors',
              i < step ? 'bg-green-500/20 border-green-500 text-green-400' :
              i === step ? 'bg-primary/20 border-primary text-primary' :
              'border-border text-muted-foreground'
            )}>
              {i < step ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
            </div>
            <span className={cn('ml-2 text-sm hidden sm:inline',
              i <= step ? 'text-foreground font-medium' : 'text-muted-foreground'
            )}>{s.label}</span>
            {i < STEPS.length - 1 && (
              <ChevronRight className="mx-3 w-4 h-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 mb-6">{error}</div>
      )}

      {/* Step 1: Create User */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Langkah 1: Buat Akun Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStep1} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email *</label>
                  <Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="customer@example.com" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Password *</label>
                  <Input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder="Min 8 karakter" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nama</label>
                  <Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} placeholder="Nama lengkap" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">MT5 Account</label>
                  <Input value={userForm.mt5Account} onChange={(e) => setUserForm({ ...userForm, mt5Account: e.target.value })} placeholder="Nomor akun MT5" />
                </div>
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Membuat...' : 'Buat Akun & Lanjut'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Create License */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Langkah 2: Buat License</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-3 rounded-md bg-accent/50 text-sm">
              Akun dibuat: <span className="font-mono font-medium">{createdUser?.email}</span>
            </div>
            <form onSubmit={handleStep2} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipe License *</label>
                  <select
                    value={licenseForm.type}
                    onChange={(e) => setLicenseForm({ ...licenseForm, type: e.target.value })}
                    aria-label="License type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="VPS_INSTALLATION">VPS Installation</option>
                    <option value="PAMM_SUBSCRIBER">PAMM Subscriber</option>
                    <option value="SIGNAL_SUBSCRIBER">Signal Subscriber</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Auto Renew</label>
                  <div className="flex items-center gap-2 h-10">
                    <input
                      type="checkbox"
                      checked={licenseForm.autoRenew}
                      onChange={(e) => setLicenseForm({ ...licenseForm, autoRenew: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Ya, perpanjang otomatis</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Mulai *</label>
                  <Input type="date" value={licenseForm.startsAt} onChange={(e) => setLicenseForm({ ...licenseForm, startsAt: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Berakhir *</label>
                  <Input type="date" value={licenseForm.expiresAt} onChange={(e) => setLicenseForm({ ...licenseForm, expiresAt: e.target.value })} required />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" type="button" onClick={() => setStep(0)}>Kembali</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Membuat...' : 'Buat License & Lanjut'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Register VPS */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Langkah 3: Register VPS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-3 rounded-md bg-accent/50 text-sm">
              License: <span className="font-mono font-medium">{createdLicense?.licenseKey}</span> ({createdLicense?.type})
            </div>
            <form onSubmit={handleStep3} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nama VPS *</label>
                  <Input value={vpsForm.name} onChange={(e) => setVpsForm({ ...vpsForm, name: e.target.value })} placeholder="vps-customer-01" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Host *</label>
                  <Input value={vpsForm.host} onChange={(e) => setVpsForm({ ...vpsForm, host: e.target.value })} placeholder="192.168.1.100" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Port</label>
                  <Input type="number" value={vpsForm.port} onChange={(e) => setVpsForm({ ...vpsForm, port: e.target.value })} placeholder="8000" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Backend URL *</label>
                  <Input value={vpsForm.backendBaseUrl} onChange={(e) => setVpsForm({ ...vpsForm, backendBaseUrl: e.target.value })} placeholder="http://192.168.1.100:8000" required />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Admin Token *</label>
                  <Input type="password" value={vpsForm.adminToken} onChange={(e) => setVpsForm({ ...vpsForm, adminToken: e.target.value })} placeholder="Token autentikasi VPS backend" required />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" type="button" onClick={() => setStep(1)}>Kembali</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Mendaftarkan...' : 'Register VPS & Selesai'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Summary */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-400">Provisioning Selesai!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <SummarySection title="Akun Customer" items={[
                { label: 'Email', value: createdUser?.email || '-' },
                { label: 'Nama', value: createdUser?.name || '-' },
              ]} />
              <SummarySection title="License" items={[
                { label: 'Key', value: createdLicense?.licenseKey || '-' },
                { label: 'Tipe', value: createdLicense?.type || '-' },
                { label: 'Berakhir', value: createdLicense?.expiresAt ? new Date(createdLicense.expiresAt).toLocaleDateString('id-ID') : '-' },
              ]} />
              <SummarySection title="VPS Instance" items={[
                { label: 'Nama', value: createdVps?.name || '-' },
                { label: 'Host', value: createdVps?.host || '-' },
              ]} />
              <div className="flex gap-3 pt-4">
                <Link href="/admin/customers">
                  <Button>Kembali ke Daftar Customer</Button>
                </Link>
                <Button variant="outline" onClick={() => {
                  setStep(0);
                  setCreatedUser(null);
                  setCreatedLicense(null);
                  setCreatedVps(null);
                  setUserForm({ email: '', password: '', name: '', mt5Account: '' });
                  setLicenseForm({ type: 'VPS_INSTALLATION', startsAt: new Date().toISOString().split('T')[0], expiresAt: '', autoRenew: false });
                  setVpsForm({ name: '', host: '', port: '8000', backendBaseUrl: '', adminToken: '' });
                  setError('');
                }}>
                  Tambah Customer Lain
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummarySection({ title, items }: { title: string; items: { label: string; value: string }[] }) {
  return (
    <div className="p-4 rounded-lg border">
      <h4 className="text-sm font-medium mb-3">{title}</h4>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-mono">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
