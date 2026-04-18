'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';

export function TwoFaTab() {
  const { getAuthHeaders } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupOtpauth, setSetupOtpauth] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setLoading(true);
    const res = await fetch('/api/client/2fa', { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      setEnabled(data.enabled);
      setEmail(data.email);
    }
    setLoading(false);
  }

  async function startSetup() {
    setMessage('');
    const res = await fetch('/api/client/2fa', {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setup' }),
    });
    if (!res.ok) { setMessage(`Gagal memulai setup (${res.status})`); return; }
    const data = await res.json();
    setSetupSecret(data.secret);
    setSetupOtpauth(data.otpauth);
  }

  async function verify() {
    setMessage('');
    const res = await fetch('/api/client/2fa', {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', code }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? `Gagal verifikasi (${res.status})`);
      return;
    }
    const data = await res.json();
    setRecoveryCodes(data.recoveryCodes);
    setSetupSecret(null);
    setSetupOtpauth(null);
    setCode('');
    await refresh();
  }

  async function disable() {
    if (!confirm('Yakin matikan 2FA? Akun akan lebih rentan.')) return;
    const res = await fetch('/api/client/2fa', {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'disable' }),
    });
    if (res.ok) {
      setRecoveryCodes(null);
      await refresh();
    }
  }

  const qrSrc = setupOtpauth ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(setupOtpauth)}` : null;

  if (loading) return <p className="text-muted-foreground">Memuat…</p>;

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Two-Factor Authentication (TOTP)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Status</p>
              <p className={enabled ? 'text-emerald-400 text-sm font-medium' : 'text-muted-foreground text-sm'}>
                {enabled ? 'Aktif' : 'Belum aktif'}
              </p>
              {email && <p className="text-xs text-muted-foreground mt-1">{email}</p>}
            </div>
            {enabled ? (
              <Button variant="outline" onClick={disable}>Nonaktifkan</Button>
            ) : (
              !setupSecret && <Button onClick={startSetup}>Aktifkan 2FA</Button>
            )}
          </div>

          {setupSecret && (
            <div className="space-y-4 pt-4 border-t border-border/40">
              <p className="text-sm">
                1. Scan QR berikut dengan aplikasi authenticator (Google Authenticator, Authy, 1Password, dll.)
              </p>
              <div className="flex items-center gap-6 flex-wrap">
                {qrSrc && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrSrc} alt="QR code setup 2FA" className="rounded bg-white p-2" width={180} height={180} />
                )}
                <div className="text-sm">
                  <p className="text-muted-foreground mb-1">Atau masukkan manual:</p>
                  <code className="font-mono text-xs break-all">{setupSecret}</code>
                </div>
              </div>
              <p className="text-sm">2. Masukkan 6-digit kode dari aplikasi untuk konfirmasi:</p>
              <div className="flex items-center gap-2">
                <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric" placeholder="123456" className="font-mono w-32 text-center tracking-widest" />
                <Button onClick={verify} disabled={code.length !== 6}>Verifikasi & aktifkan</Button>
              </div>
            </div>
          )}

          {recoveryCodes && (
            <div className="space-y-2 p-4 rounded-md border border-amber-400/30 bg-amber-400/5">
              <p className="text-sm font-medium text-amber-400">Simpan kode pemulihan ini di tempat aman.</p>
              <p className="text-xs text-muted-foreground">
                Setiap kode hanya bisa dipakai sekali. Gunakan kode ini jika kehilangan akses ke aplikasi authenticator.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-3 font-mono text-sm">
                {recoveryCodes.map((c) => <code key={c} className="bg-background/50 px-2 py-1 rounded">{c}</code>)}
              </div>
            </div>
          )}

          {message && <p className="text-sm text-rose-400">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
