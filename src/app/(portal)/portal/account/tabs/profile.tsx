'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';

interface Profile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  mt5Account: string | null;
  telegramChatId: string | null;
  whatsappNumber: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export function ProfileTab() {
  const { getAuthHeaders } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [telegram, setTelegram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/client/profile', { headers: getAuthHeaders() })
      .then((r) => r.ok ? r.json() : null)
      .then((p) => {
        if (p) {
          setProfile(p);
          setName(p.name ?? '');
          setTelegram(p.telegramChatId ?? '');
          setWhatsapp(p.whatsappNumber ?? '');
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/client/profile', {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, telegramChatId: telegram, whatsappNumber: whatsapp }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setMessage('Profil tersimpan.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return <p className="text-muted-foreground">Memuat…</p>;

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-lg font-semibold">Identitas</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <ReadonlyRow label="Email" value={profile.email} />
          <ReadonlyRow label="Role" value={profile.role} />
          <ReadonlyRow label="MT5 account" value={profile.mt5Account ?? '—'} />
          <ReadonlyRow label="Anggota sejak" value={new Date(profile.createdAt).toLocaleDateString('id-ID')} />
          <ReadonlyRow label="Login terakhir" value={profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString('id-ID') : '—'} />
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-lg font-semibold">Kontak & Preferensi</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="name" className="text-xs text-muted-foreground mb-1 block">Nama</label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" />
          </div>
          <div>
            <label htmlFor="tg" className="text-xs text-muted-foreground mb-1 block">Telegram Chat ID</label>
            <Input id="tg" value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="misal 123456789" />
            <p className="text-xs text-muted-foreground mt-1">
              Dapatkan ID Anda dengan mengirim pesan ke @userinfobot di Telegram.
            </p>
          </div>
          <div>
            <label htmlFor="wa" className="text-xs text-muted-foreground mb-1 block">Nomor WhatsApp</label>
            <Input id="wa" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="62812XXXXXXXX" />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
            {message && <span className="text-sm text-muted-foreground">{message}</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReadonlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
