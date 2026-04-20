'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { ArrowLeft, Bot, CheckCircle2, ExternalLink, MessageCircle, XCircle } from 'lucide-react';

interface Profile {
  telegramChatId?: string | null;
}

export default function MyVpsTelegramPage() {
  const { getAuthHeaders } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/client/profile', { headers: getAuthHeaders() });
        if (res.ok) setProfile(await res.json());
      } catch { /* handled */ }
      finally { setLoading(false); }
    }
    fetchProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isConnected = !!profile?.telegramChatId;

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
          <h1 className="text-2xl font-bold">Notifikasi Telegram</h1>
          <p className="text-sm text-muted-foreground">Hubungkan akun Telegram untuk menerima notifikasi trading</p>
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageCircle className="w-4 h-4" /> Status Koneksi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Memuat...</p>
          ) : (
            <div className="flex items-center gap-3">
              {isConnected ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-green-400">Terhubung</p>
                    <p className="text-xs text-muted-foreground">Chat ID: {profile?.telegramChatId}</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-sm font-medium text-red-400">Belum Terhubung</p>
                    <p className="text-xs text-muted-foreground">Ikuti langkah di bawah untuk menghubungkan</p>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bot className="w-4 h-4" /> Cara Menghubungkan Telegram
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Step number={1} title="Buka Bot Telegram Kami">
              <p className="text-sm text-muted-foreground">
                Cari <span className="font-mono font-medium text-foreground">@BabahAlgoBot</span> di Telegram
                atau klik tombol di bawah.
              </p>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <a href="https://t.me/BabahAlgoBot" target="_blank" rel="noopener noreferrer">
                  Buka di Telegram <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Button>
            </Step>

            <Step number={2} title="Kirim Perintah /start">
              <p className="text-sm text-muted-foreground">
                Ketik <span className="font-mono font-medium text-foreground">/start</span> di chat bot
                untuk memulai proses pendaftaran.
              </p>
            </Step>

            <Step number={3} title="Verifikasi Akun">
              <p className="text-sm text-muted-foreground">
                Bot akan meminta email Anda untuk verifikasi. Masukkan email yang sama
                dengan akun BabahAlgo Anda.
              </p>
            </Step>

            <Step number={4} title="Selesai!">
              <p className="text-sm text-muted-foreground">
                Setelah terverifikasi, Anda akan menerima notifikasi trading secara otomatis:
                trade dibuka, trade ditutup, dan laporan harian.
              </p>
            </Step>
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Jenis Notifikasi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <NotifType icon="📈" title="Trade Dibuka" desc="Notifikasi setiap kali bot membuka posisi baru" />
            <NotifType icon="📉" title="Trade Ditutup" desc="Notifikasi hasil trade (profit/loss) saat posisi ditutup" />
            <NotifType icon="📊" title="Laporan Harian" desc="Ringkasan performa trading setiap akhir hari" />
            <NotifType icon="⚠️" title="Peringatan Sistem" desc="Alert jika ada masalah koneksi atau error pada bot" />
          </div>
        </CardContent>
      </Card>

      {/* Link to Account */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Anda juga dapat mengubah Chat ID Telegram dari halaman akun.
            </p>
            <Link href="/portal/account">
              <Button variant="outline" size="sm">Ke Halaman Akun</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex gap-4 p-4 rounded-lg border')}>
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div>
        <p className="text-sm font-medium mb-1">{title}</p>
        {children}
      </div>
    </div>
  );
}

function NotifType({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border">
      <span className="text-lg">{icon}</span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
