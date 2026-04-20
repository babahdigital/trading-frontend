'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { ArrowLeft, ChevronDown, HelpCircle, Mail, MessageSquare, Send } from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: 'Berapa lama waktu setup VPS?',
    a: 'Setup VPS biasanya memakan waktu 1-2 jam setelah pembayaran dikonfirmasi. Anda akan menerima notifikasi email dan Telegram saat VPS siap digunakan.',
  },
  {
    q: 'Apakah bot trading berjalan 24 jam?',
    a: 'Ya, bot berjalan 24/5 mengikuti jam pasar forex. Bot akan otomatis berhenti saat pasar tutup di akhir pekan dan melanjutkan saat pasar buka kembali.',
  },
  {
    q: 'Bagaimana cara menambah pair trading?',
    a: 'Hubungi admin melalui form di bawah atau via Telegram. Tim kami akan mengkonfigurasi pair baru pada VPS Anda sesuai analisis risiko.',
  },
  {
    q: 'Apa yang terjadi jika koneksi VPS terputus?',
    a: 'Sistem kami memiliki monitoring otomatis. Jika VPS offline, tim akan segera melakukan pengecekan dan pemulihan. Posisi yang sudah terbuka dilindungi oleh stop loss di server broker.',
  },
  {
    q: 'Bagaimana cara memperpanjang lisensi?',
    a: 'Anda akan menerima notifikasi 7 hari sebelum lisensi berakhir. Hubungi admin atau kunjungi halaman billing untuk memperpanjang.',
  },
  {
    q: 'Apakah saya bisa melihat log trading detail?',
    a: 'Ya, semua riwayat trade tersedia di halaman Riwayat Trade. Anda juga bisa mengunduh data dalam format CSV untuk analisis lebih lanjut.',
  },
];

export default function MyVpsSupportPage() {
  const { getAuthHeaders } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setError('Semua field wajib diisi');
      return;
    }
    if (form.message.length < 10) {
      setError('Pesan minimal 10 karakter');
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/client/inquiries', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          message: form.message,
          package: 'VPS_LICENSE',
        }),
      });
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) throw new Error('Gagal mengirim pesan');
      setSent(true);
      setForm({ name: '', email: '', message: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Koneksi error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/portal/my-vps">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Bantuan & Support</h1>
          <p className="text-sm text-muted-foreground">FAQ dan formulir kontak untuk bantuan teknis</p>
        </div>
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <HelpCircle className="w-4 h-4" /> Pertanyaan Umum (FAQ)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="border rounded-lg">
                <button
                  className="w-full flex items-center justify-between p-4 text-left text-sm font-medium hover:bg-accent/50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {item.q}
                  <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', openFaq === i && 'rotate-180')} />
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 text-sm text-muted-foreground">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">support@babahalgo.com</p>
                <p className="text-xs text-muted-foreground mt-1">Respon dalam 1x24 jam</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Telegram</p>
                <p className="text-sm text-muted-foreground">@BabahAlgoSupport</p>
                <p className="text-xs text-muted-foreground mt-1">Respon lebih cepat via Telegram</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Send className="w-4 h-4" /> Kirim Pesan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center py-8">
              <p className="text-green-400 font-medium mb-2">Pesan berhasil dikirim!</p>
              <p className="text-sm text-muted-foreground mb-4">Tim kami akan merespon dalam 1x24 jam.</p>
              <Button variant="outline" size="sm" onClick={() => setSent(false)}>
                Kirim Pesan Lagi
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Nama</label>
                  <Input
                    placeholder="Nama lengkap"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Email</label>
                  <Input
                    type="email"
                    placeholder="email@contoh.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Pesan</label>
                <textarea
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Jelaskan pertanyaan atau masalah Anda..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>
              {error && (
                <div className="text-sm text-red-400">{error}</div>
              )}
              <Button type="submit" disabled={sending}>
                {sending ? 'Mengirim...' : 'Kirim Pesan'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
