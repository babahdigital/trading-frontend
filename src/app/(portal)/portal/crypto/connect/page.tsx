'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, ShieldCheck, ShieldAlert, AlertTriangle, ExternalLink, Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SubmitResult {
  ok?: boolean;
  source?: 'mock' | 'backend';
  verified?: boolean;
  permissions?: { canTrade: boolean; canRead: boolean; canWithdraw: boolean };
  error?: string;
  message?: string;
}

export default function CryptoConnectPage() {
  const router = useRouter();
  const { getAuthHeaders } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [testnet, setTestnet] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/crypto/keys/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ api_key: apiKey.trim(), api_secret: apiSecret.trim(), testnet }),
      });
      const body = (await res.json()) as SubmitResult;
      setResult(body);
      if (res.ok && body.ok) {
        setTimeout(() => router.push('/portal/crypto'), 1500);
      }
    } catch (err) {
      setResult({ error: 'network_error', message: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setSubmitting(false);
    }
  }

  const verified = result?.ok && result?.verified;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Link href="/portal/crypto" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="h-4 w-4" /> Kembali ke Crypto Bot
      </Link>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
          <KeyRound className="h-6 w-6 sm:h-7 sm:w-7 text-amber-400" />
          Hubungkan Akun Binance
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Bot membutuhkan API key Binance Anda untuk eksekusi trading otomatis. Dana selalu di Binance — kami tidak bisa withdraw.
        </p>
      </div>

      {/* Permission disclaimer */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 sm:p-5 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-200 mb-1">Wajib: Permissions API key yang benar</p>
            <ul className="space-y-1 text-amber-200/80">
              <li>✓ Aktifkan: <span className="font-mono">Enable Reading</span> dan <span className="font-mono">Enable Futures</span> (untuk perpetual futures)</li>
              <li>✓ Aktifkan: <span className="font-mono">Enable Spot &amp; Margin Trading</span> (jika strategi spot dipilih)</li>
              <li className="text-red-300">✗ JANGAN aktifkan: <span className="font-mono">Enable Withdrawals</span></li>
              <li>→ Set <span className="font-mono">IP Restriction</span> ke alamat statis kami untuk keamanan ekstra</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="api_key" className="block text-sm font-medium mb-2">
                API Key
              </label>
              <input
                id="api_key"
                type="text"
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="contoh: 4a8b2c… (64 karakter)"
                className="w-full font-mono text-sm rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor="api_secret" className="block text-sm font-medium mb-2">
                API Secret
              </label>
              <div className="relative">
                <input
                  id="api_secret"
                  type={showSecret ? 'text' : 'password'}
                  required
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="••••••••"
                  className="w-full font-mono text-sm rounded-md border border-input bg-background px-3 py-2 pr-10 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent"
                  aria-label={showSecret ? 'Sembunyikan' : 'Tampilkan'}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Disimpan terenkripsi (Fernet master key + Vault). Plaintext tidak pernah disimpan setelah verifikasi.
              </p>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={testnet}
                onChange={(e) => setTestnet(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm">
                Ini key <span className="font-mono">testnet</span> (untuk uji coba — tidak ada eksekusi nyata)
              </span>
            </label>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button type="submit" disabled={submitting || !apiKey || !apiSecret} className="sm:flex-1">
                {submitting ? 'Memverifikasi…' : 'Submit & Verifikasi'}
              </Button>
              <Button type="button" variant="outline" asChild className="sm:w-auto">
                <a
                  href="https://www.binance.com/en/my/settings/api-management"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  Buka Binance API Management
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Result panel */}
      {result && (
        <Card className={cn(
          'border-2',
          verified ? 'border-green-500/40 bg-green-500/5' : 'border-red-500/40 bg-red-500/5',
        )}>
          <CardContent className="p-5 flex items-start gap-3">
            {verified ? (
              <ShieldCheck className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="text-sm space-y-1.5 flex-1 min-w-0">
              {verified ? (
                <>
                  <p className="font-semibold text-green-300">Berhasil terverifikasi.</p>
                  <p className="text-green-200/80">
                    {result.source === 'mock'
                      ? 'Mode demo: backend bot belum aktif, namun langganan Anda sudah dimulai.'
                      : 'Bot siap menjalankan strategi sesuai konfigurasi tier Anda.'}
                  </p>
                  {result.permissions && (
                    <ul className="font-mono text-xs text-green-200/70 mt-2 space-y-0.5">
                      <li>canRead: {String(result.permissions.canRead)}</li>
                      <li>canTrade: {String(result.permissions.canTrade)}</li>
                      <li>canWithdraw: {String(result.permissions.canWithdraw)} {result.permissions.canWithdraw && '⚠️'}</li>
                    </ul>
                  )}
                  <p className="text-green-200/60 text-xs mt-2">Mengarahkan ke dashboard…</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-red-300">{result.error ?? 'Verifikasi gagal'}</p>
                  <p className="text-red-200/80">{result.message ?? 'Periksa kembali API key & secret, atau coba lagi.'}</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Crypto disclaimer */}
      <p className="text-xs text-muted-foreground/70 leading-relaxed">
        Trading kripto sangat volatil. Kinerja masa lalu tidak menjamin hasil masa depan. Anda tetap memegang dana di
        akun Binance Anda; kami tidak bisa melakukan withdraw. Gunakan hanya dana yang Anda relakan untuk hilang.
      </p>
    </div>
  );
}
