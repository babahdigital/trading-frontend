'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/toast';
import { TIER_ORDER, TIERS, type TierName, tierAccentClasses } from '@/lib/tiers/tier-config';
import { cn } from '@/lib/utils';
import { ShieldAlert, ArrowDownToLine, ArrowUpToLine, Pause, Play } from 'lucide-react';

interface TenantActionsProps {
  tenantId: string;
  /** Current tier (FE display) — UI optimistic update saat change-tier success */
  currentTier?: TierName | null;
  /** Tenant sedang suspended */
  isSuspended?: boolean;
  /** Optional callback ke parent supaya bisa refetch list */
  onMutated?: () => void;
}

type DialogMode = 'change-tier' | 'suspend' | 'reactivate' | null;

/**
 * Admin tenant action panel — change-tier, suspend, reactivate.
 *
 * Proxy ke backend forex admin endpoints (Phase 14V):
 *   POST /api/forex/admin/tenants/{id}/change-tier
 *   POST /api/forex/admin/tenants/{id}/suspend
 *   POST /api/forex/admin/tenants/{id}/reactivate
 *
 * Setiap action butuh `reason` (audit trail), validate ≤512 char.
 * Idempotency-Key auto-inject di proxy untuk hindari duplicate write.
 */
export function TenantActions({ tenantId, currentTier, isSuspended, onMutated }: TenantActionsProps) {
  const { getAuthHeaders } = useAuth();
  const toast = useToast();
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [reason, setReason] = useState('');
  const [targetTier, setTargetTier] = useState<TierName>(currentTier ?? 'starter');
  const [submitting, setSubmitting] = useState(false);

  const closeDialog = () => {
    if (submitting) return;
    setDialog(null);
    setReason('');
  };

  async function callAction(path: string, body: object) {
    setSubmitting(true);
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.push({ tone: 'success', title: 'Aksi tenant berhasil', description: data.action || 'updated' });
        onMutated?.();
        setDialog(null);
        setReason('');
      } else {
        const code = data.code || `HTTP ${res.status}`;
        toast.push({ tone: 'error', title: 'Gagal menjalankan aksi', description: `${code}: ${data.error || 'unknown'}` });
      }
    } catch (err) {
      toast.push({
        tone: 'error',
        title: 'Network error',
        description: err instanceof Error ? err.message : 'unknown',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleChangeTier() {
    if (!targetTier || !reason.trim()) return;
    await callAction(`/api/admin/tenants/${encodeURIComponent(tenantId)}/change-tier`, {
      tier: targetTier,
      reason: reason.trim(),
    });
  }

  async function handleSuspend() {
    if (!reason.trim()) return;
    await callAction(`/api/admin/tenants/${encodeURIComponent(tenantId)}/suspend`, {
      reason: reason.trim(),
    });
  }

  async function handleReactivate() {
    if (!reason.trim()) return;
    await callAction(`/api/admin/tenants/${encodeURIComponent(tenantId)}/reactivate`, {
      reason: reason.trim(),
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDialog('change-tier')}
          className="gap-1.5"
          title="Change tenant tier"
        >
          {currentTier && compareTier(targetTier, currentTier) > 0 ? (
            <ArrowUpToLine className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownToLine className="h-3.5 w-3.5" />
          )}
          Change Tier
        </Button>
        {isSuspended ? (
          <Button
            size="sm"
            variant="default"
            onClick={() => setDialog('reactivate')}
            className="gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            Reactivate
          </Button>
        ) : (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setDialog('suspend')}
            className="gap-1.5"
          >
            <Pause className="h-3.5 w-3.5" />
            Suspend
          </Button>
        )}
      </div>

      {/* Change Tier Dialog */}
      <Dialog open={dialog === 'change-tier'} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change tenant tier</DialogTitle>
            <DialogDescription>
              Tenant <code className="font-mono text-xs">{tenantId}</code>
              {currentTier ? ` saat ini di tier ${currentTier.toUpperCase()}.` : '.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium block">Target tier</label>
            <div className="grid grid-cols-5 gap-1.5">
              {TIER_ORDER.map((t) => {
                const accent = tierAccentClasses(TIERS[t].accent);
                const isActive = targetTier === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTargetTier(t)}
                    className={cn(
                      'px-2 py-2 rounded-md text-[11px] font-mono uppercase tracking-wider border-2 transition-all',
                      isActive
                        ? `${accent.bg} ${accent.text} border-current`
                        : 'border-border text-muted-foreground hover:border-foreground/30',
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <label className="text-sm font-medium block mt-3">Alasan ({reason.length}/512)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={512}
              placeholder="KYC verified, upgrade to PRO per customer request"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeDialog} disabled={submitting}>Batal</Button>
              <Button onClick={handleChangeTier} disabled={!reason.trim() || submitting}>
                {submitting ? 'Memproses…' : 'Apply'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={dialog === 'suspend'} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-500" />
              Suspend tenant
            </DialogTitle>
            <DialogDescription>
              Semua engine akan di-set kosong (no new trades). Posisi aktif di-close worker loop by EOD.
              Tenant tetap bisa login + lihat audit log, tapi tidak bisa trade.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium block">Alasan ({reason.length}/512)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={512}
              placeholder="Payment overdue 30+ days; awaiting renewal"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeDialog} disabled={submitting}>Batal</Button>
              <Button variant="destructive" onClick={handleSuspend} disabled={!reason.trim() || submitting}>
                {submitting ? 'Suspending…' : 'Suspend'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reactivate Dialog */}
      <Dialog open={dialog === 'reactivate'} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-4 w-4 text-emerald-500" />
              Reactivate tenant
            </DialogTitle>
            <DialogDescription>
              Engine di-restore ke konfigurasi sebelum suspend (default tier policy kalau record kosong).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium block">Alasan ({reason.length}/512)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={512}
              placeholder="Payment cleared 2026-05-15, reactivating per ticket #1234"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeDialog} disabled={submitting}>Batal</Button>
              <Button onClick={handleReactivate} disabled={!reason.trim() || submitting}>
                {submitting ? 'Memproses…' : 'Reactivate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function compareTier(a: TierName, b: TierName): number {
  return TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b);
}
