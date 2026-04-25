'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, ChevronLeft, AlertOctagon, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface RiskProfile {
  max_leverage: number;
  max_concurrent_positions: number;
  max_daily_loss_usd: number;
  liquidation_buffer_atr: number;
  risk_per_trade_pct: number;
  kill_switch_active: boolean;
  loss_streak_threshold: number;
  loss_streak_cooldown_min: number;
}

const TIER_CAPS: Record<string, { leverage: number; positions: number }> = {
  CRYPTO_BASIC: { leverage: 5, positions: 3 },
  CRYPTO_PRO: { leverage: 10, positions: 5 },
  CRYPTO_HNWI: { leverage: 15, positions: 8 },
};

export default function CryptoRiskPage() {
  const { getAuthHeaders } = useAuth();
  const [profile, setProfile] = useState<RiskProfile | null>(null);
  const [tier, setTier] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [killing, setKilling] = useState(false);
  const [killReason, setKillReason] = useState('');
  const [showKillModal, setShowKillModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/crypto/risk/profile', { headers: getAuthHeaders() });
        if (res.ok) {
          const body = await res.json();
          setProfile(body);
          setTier(body.tier ?? '');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [getAuthHeaders]);

  async function save() {
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch('/api/crypto/risk/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          max_leverage: profile.max_leverage,
          max_concurrent_positions: profile.max_concurrent_positions,
          max_daily_loss_usd: profile.max_daily_loss_usd,
          liquidation_buffer_atr: profile.liquidation_buffer_atr,
          risk_per_trade_pct: profile.risk_per_trade_pct,
          loss_streak_threshold: profile.loss_streak_threshold,
          loss_streak_cooldown_min: profile.loss_streak_cooldown_min,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error');
    } finally {
      setSaving(false);
    }
  }

  async function triggerKillSwitch() {
    if (!killReason.trim() || killReason.trim().length < 3) return;
    setKilling(true);
    try {
      const res = await fetch('/api/crypto/risk/kill-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ reason: killReason.trim(), close_all_positions: true }),
      });
      if (res.ok) {
        setShowKillModal(false);
        setKillReason('');
        // Refresh profile
        const r = await fetch('/api/crypto/risk/profile', { headers: getAuthHeaders() });
        if (r.ok) setProfile(await r.json());
      }
    } finally {
      setKilling(false);
    }
  }

  const cap = TIER_CAPS[tier] ?? { leverage: 5, positions: 3 };

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-md bg-white/5 animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/portal/crypto" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Kembali
      </Link>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
          <Shield className="h-6 w-6 sm:h-7 sm:w-7 text-amber-400" />
          Risk Profile
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Tier <span className="font-mono text-amber-300">{tier}</span> · cap leverage {cap.leverage}x · max {cap.positions} posisi paralel
        </p>
      </div>

      {error && <div className="p-3 rounded-md border border-red-500/30 bg-red-500/5 text-red-300 text-sm">{error}</div>}
      {success && (
        <div className="p-3 rounded-md border border-green-500/30 bg-green-500/5 text-green-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Risk profile tersimpan.
        </div>
      )}

      {profile && (
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <NumField label="Max Leverage" value={profile.max_leverage} max={cap.leverage} step={1} suffix="x"
                onChange={(v) => setProfile({ ...profile, max_leverage: v })} />
              <NumField label="Max Concurrent Positions" value={profile.max_concurrent_positions} max={cap.positions} step={1}
                onChange={(v) => setProfile({ ...profile, max_concurrent_positions: v })} />
              <NumField label="Max Daily Loss (USD)" value={profile.max_daily_loss_usd} max={10_000} step={10} prefix="$"
                onChange={(v) => setProfile({ ...profile, max_daily_loss_usd: v })} />
              <NumField label="Risk per Trade (%)" value={profile.risk_per_trade_pct} max={5} step={0.1} suffix="%"
                onChange={(v) => setProfile({ ...profile, risk_per_trade_pct: v })} />
              <NumField label="Liquidation Buffer (ATR)" value={profile.liquidation_buffer_atr} max={10} step={0.5} suffix="x ATR"
                onChange={(v) => setProfile({ ...profile, liquidation_buffer_atr: v })} />
              <NumField label="Loss Streak Cooldown (menit)" value={profile.loss_streak_cooldown_min} max={1440} step={5}
                onChange={(v) => setProfile({ ...profile, loss_streak_cooldown_min: v })} />
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Simpan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kill Switch */}
      <Card className="border-red-500/30 bg-red-500/[0.03]">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertOctagon className="h-6 w-6 text-red-400 shrink-0" />
            <div>
              <h2 className="font-bold text-red-300">Emergency Kill Switch</h2>
              <p className="text-sm text-red-200/80 mt-1">
                Tutup semua posisi terbuka secara langsung dan jeda bot. Gunakan saat volatilitas ekstrem atau bila bot mencurigakan.
              </p>
            </div>
          </div>
          <Button variant="destructive" onClick={() => setShowKillModal(true)} className="w-full sm:w-auto">
            Aktifkan Kill Switch
          </Button>
        </CardContent>
      </Card>

      {/* Kill modal */}
      {showKillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <Card className="w-full max-w-md border-red-500/40">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-red-400" />
                <h3 className="font-bold">Konfirmasi Kill Switch</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Semua posisi terbuka akan ditutup market price. Aksi ini akan tercatat di audit log.
              </p>
              <div>
                <label className="text-sm font-medium block mb-1.5">Alasan (3-280 karakter)</label>
                <textarea
                  value={killReason}
                  onChange={(e) => setKillReason(e.target.value)}
                  rows={3}
                  className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  placeholder="cth: volatilitas pasar tidak normal, exchange maintenance, dll."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setShowKillModal(false); setKillReason(''); }}>Batal</Button>
                <Button variant="destructive" onClick={triggerKillSwitch} disabled={killing || killReason.trim().length < 3}>
                  {killing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Konfirmasi & Kill'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function NumField({
  label, value, onChange, max, step = 1, prefix = '', suffix = '',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
  step?: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1.5">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>}
        <input
          type="number"
          value={value}
          min={0}
          max={max}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full text-sm font-mono rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ paddingLeft: prefix ? '1.75rem' : undefined, paddingRight: suffix ? '3rem' : undefined }}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
      <p className="text-[10px] text-muted-foreground mt-0.5">Max: {max}{suffix}</p>
    </div>
  );
}
