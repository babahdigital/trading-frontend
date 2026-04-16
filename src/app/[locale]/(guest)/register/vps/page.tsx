'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function RegisterVpsPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', message: '' });

  function set(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/client/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, package: 'VPS_LICENSE' }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error?.fieldErrors ? Object.values(data.error.fieldErrors).flat().join(', ') : 'Terjadi kesalahan');
      }
    } catch {
      setError('Gagal mengirim. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-primary">BabahAlgo</Link>
          <Link href="/register" className="text-sm text-muted-foreground hover:text-foreground">Kembali</Link>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-16">
        {submitted ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-4xl mb-4">&#9989;</div>
              <h2 className="text-2xl font-bold mb-2">Terima Kasih!</h2>
              <p className="text-muted-foreground mb-6">
                Tim kami akan menghubungi Anda dalam 1x24 jam untuk konsultasi lebih lanjut mengenai VPS License.
              </p>
              <Link href="/" className="text-primary hover:underline">Kembali ke Beranda</Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Konsultasi VPS License</CardTitle>
              <CardDescription>
                VPS License dimulai dari $3,000 setup fee. Isi form di bawah dan tim kami akan menghubungi Anda.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Nama Lengkap *</label>
                  <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="John Doe" required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Email *</label>
                  <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="john@example.com" required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">WhatsApp / Phone</label>
                  <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+62 xxx-xxxx-xxxx" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Perusahaan / Institusi</label>
                  <Input value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="Opsional" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Pesan *</label>
                  <Textarea
                    value={form.message}
                    onChange={(e) => set('message', e.target.value)}
                    placeholder="Ceritakan kebutuhan trading Anda, jumlah akun, budget estimasi, dll."
                    rows={4}
                    required
                  />
                </div>
                {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Mengirim...' : 'Kirim Permintaan Konsultasi'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
