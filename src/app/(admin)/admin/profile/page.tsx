'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';

export default function AdminProfilePage() {
  const { getAuthHeaders } = useAuth();
  const router = useRouter();

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPw.length < 8) {
      setError('Password baru minimal 8 karakter.');
      return;
    }
    if (newPw !== confirmPw) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/client/password', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === 'wrong_current_password') {
          setError('Password saat ini salah.');
        } else if (data.code === 'same_as_old') {
          setError('Password baru harus berbeda dari password saat ini.');
        } else if (data.code === 'validation_failed') {
          setError('Password baru minimal 8 karakter.');
        } else {
          setError(data.error || 'Gagal mengubah password.');
        }
        return;
      }
      setMessage('Password berhasil diubah. Anda akan diarahkan ke halaman login...');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Akun Saya</h1>
        <p className="text-sm text-muted-foreground mt-1">Pengaturan akun admin</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Ubah Password</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Setelah password diubah, semua sesi aktif akan keluar dan Anda harus login kembali.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="current-pw" className="text-xs text-muted-foreground mb-1 block">
                Password saat ini
              </label>
              <Input
                id="current-pw"
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <div>
              <label htmlFor="new-pw" className="text-xs text-muted-foreground mb-1 block">
                Password baru (min 8 karakter)
              </label>
              <Input
                id="new-pw"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div>
              <label htmlFor="confirm-pw" className="text-xs text-muted-foreground mb-1 block">
                Konfirmasi password baru
              </label>
              <Input
                id="confirm-pw"
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 p-3 rounded-md" role="alert">
                {error}
              </div>
            )}
            {message && (
              <div className="text-sm text-emerald-400 bg-emerald-400/10 p-3 rounded-md" role="status">
                {message}
              </div>
            )}

            <Button type="submit" disabled={saving || !currentPw || !newPw || !confirmPw}>
              {saving ? 'Menyimpan…' : 'Ubah Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
