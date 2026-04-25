'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Shield, ChevronLeft, AlertOctagon, Save, Loader2, CheckCircle2, Cpu } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface LeverageState {
  source?: 'mock' | 'backend';
  tier?: string;
  profile_cap?: number;
  user_leverage_override?: number | null;
  ai_suggestion?: number | null;
  effective?: number;
}

const TIER_CAPS: Record<string, number> = {
  CRYPTO_BASIC: 5,
  CRYPTO_PRO: 10,
  CRYPTO_HNWI: 15,
};

export default function CryptoRiskPage() {
  const { getAuthHeaders } = useAuth();
  const [state, setState] = useState<LeverageState | null>(null);
  const [override, setOverride] = useState<number>(5);
  const [tier, setTier] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [killing, setKilling] = useState(false);
  const [killReason, setKillReason] = useState('');
  const [showKillModal, setShowKillModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/crypto/leverage', { headers: getAuthHeaders() });
      if (res.ok) {
        const body: LeverageState = await res.json();
        setState(body);
        setTier(body.tier ?? '');
        setOverride(body.user_leverage_override ?? body.effective ?? body.profile_cap ?? 5);
      }
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch('/api/crypto/leverage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ user_leverage_override: override }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
      setSuccess(true);
      load();
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
        body: JSON.stringify({ reason: killReason.trim() }),
      });
      if (res.ok) {
        setShowKillModal(false);
        setKillReason('');
      }
    } finally {
      setKilling(false);
    }
  }

  const cap = state?.profile_cap ?? TIER_CAPS[tier] ?? 5;
  const aiSuggestion = state?.ai_suggestion ?? null;

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
          Leverage & Kill Switch
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Tier <span className="font-mono text-amber-300">{tier}</span> · cap {cap}x. Parameter risiko lain (max posisi, daily loss limit) diatur operator melalui <span className="font-mono">runtime config</span>.
        </p>
      </div>

      {error && <div className="p-3 rounded-md border border-red-500/30 bg-red-500/5 text-red-300 text-sm">{error}</div>}
      {success && (
        <div className="p-3 rounded-md border border-green-500/30 bg-green-500/5 text-green-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Leverage override tersimpan.
        </div>
      )}

      {/* Leverage card */}
      <Card>
        <CardContent className="p-5 sm:p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
              <h2 className="font-semibold">Leverage Override</h2>
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                effective: {state?.effective ?? override}x
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Override leverage di sini mengikat seluruh strategi. Nilai akhir tidak boleh melebihi cap tier ({cap}x).
            </p>
          </div>

          <div>
            <label htmlFor="leverage-input" className="block text-sm font-medium mb-1.5">User Override</label>
            <div className="flex items-center gap-3">
              <input
                id="leverage-input"
                type="range"
                min={1}
                max={cap}
                step={1}
                value={override}
                onChange={(e) => setOverride(parseInt(e.target.value, 10))}
                className="flex-1 accent-amber-500"
              />
              <span className="font-mono text-lg w-16 text-right">{override}x</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5 font-mono">
              <span>1x</span>
              <span>{cap}x (cap)</span>
            </div>
          </div>

          {aiSuggestion != null && (
            <div className="flex items-start gap-2.5 p-3 rounded-md bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200/90">
              <Cpu className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">AI suggestion:</span> {aiSuggestion}x ·
                <button
                  type="button"
                  onClick={() => setOverride(aiSuggestion)}
                  className="text-amber-400 hover:text-amber-300 ml-1.5 underline-offset-2 hover:underline"
                >
                  pakai saran ini
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Simpan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Kill Switch */}
      <Card className="border-red-500/30 bg-red-500/[0.03]">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertOctagon className="h-6 w-6 text-red-400 shrink-0" />
            <div>
              <h2 className="font-bold text-red-300">Emergency Kill Switch</h2>
              <p className="text-sm text-red-200/80 mt-1 leading-relaxed">
                Halt seluruh dispatcher untuk tenant Anda secara langsung. Posisi terbuka dibiarkan dengan SL/TP — gunakan
                close manual per posisi kalau perlu tutup paksa. Kill switch dicabut otomatis bila admin clear, atau via API.
              </p>
            </div>
          </div>
          <Button variant="destructive" onClick={() => setShowKillModal(true)} className="w-full sm:w-auto">
            Aktifkan Kill Switch
          </Button>
        </CardContent>
      </Card>

      {/* Kill modal — pakai shadcn Dialog */}
      <Dialog open={showKillModal} onOpenChange={(o) => { setShowKillModal(o); if (!o) setKillReason(''); }}>
        <DialogContent className="border-red-500/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-300">
              <AlertOctagon className="h-5 w-5" /> Konfirmasi Kill Switch
            </DialogTitle>
            <DialogDescription>
              Bot akan halt seluruh dispatcher pass. Aksi ini tercatat di audit log dan bisa dicabut admin saja.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium block mb-1.5">Alasan (3-280 karakter)</label>
            <textarea
              value={killReason}
              onChange={(e) => setKillReason(e.target.value)}
              rows={3}
              className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="cth: volatilitas pasar tidak normal, exchange maintenance, flag risk dari analyst"
              maxLength={280}
            />
            <p className="text-[10px] text-muted-foreground mt-1 font-mono">{killReason.length}/280</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowKillModal(false); setKillReason(''); }}>Batal</Button>
            <Button variant="destructive" onClick={triggerKillSwitch} disabled={killing || killReason.trim().length < 3}>
              {killing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Konfirmasi & Kill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
