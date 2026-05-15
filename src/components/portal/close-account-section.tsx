'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/toast';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

/**
 * Self-service account closure (Phase 14V soft delete).
 *
 * Backend: POST /api/forex/me/close-account
 * Body: { reason: string ≥3 char, confirm: true }
 *
 * Effect:
 *   - api_token revoked SEKARANG juga (irreversible per session)
 *   - tenant.status = 'deleted'
 *   - enabled_engines = [] (no new trades)
 *   - Position history retained untuk audit + AI learning
 *
 * UX flow: 2-step confirmation (reason + final OK) supaya tidak misclick.
 * Setelah ack, FE clear cookies + router push ke /goodbye.
 */
interface CloseAccountSectionProps {
  locale?: 'id' | 'en';
}

const COPY = {
  id: {
    title: 'Tutup akun',
    subtitle:
      'Anda bisa tutup akun BabahAlgo kapan saja. Token API revoke seketika, bot stop ambil entry baru. Riwayat trading tetap tersimpan untuk audit + AI learning.',
    cta_open: 'Tutup akun saya',
    dialog_title: 'Konfirmasi penutupan akun',
    dialog_desc:
      'Aksi ini segera revoke token API + set status akun jadi deleted. Tidak ada rollback otomatis. Posisi yang sedang open akan di-close worker by end-of-day.',
    reason_label: 'Alasan ({len}/512)',
    reason_placeholder: 'Mau pindah broker / sudah tidak trade / refund pending — ceritakan singkat',
    confirm_label:
      'Saya paham token API saya akan langsung di-revoke + posisi aktif akan di-close.',
    submit: 'Konfirmasi tutup akun',
    submitting: 'Memproses…',
    cancel: 'Batal',
    success: 'Akun ditutup. Anda akan di-redirect ke halaman selamat tinggal.',
    error: 'Gagal menutup akun',
    warning_header: 'Ini bukan tindakan ringan',
  },
  en: {
    title: 'Close account',
    subtitle:
      'You can close your BabahAlgo account anytime. API token is revoked immediately, the bot stops opening new entries. Trade history is retained for audit + AI learning.',
    cta_open: 'Close my account',
    dialog_title: 'Confirm account closure',
    dialog_desc:
      'This action immediately revokes your API token and marks your account as deleted. No automatic rollback. Any open positions will be closed by the worker by end-of-day.',
    reason_label: 'Reason ({len}/512)',
    reason_placeholder: 'Switching broker / no longer trading / pending refund — share briefly',
    confirm_label:
      'I understand that my API token will be revoked immediately and open positions will be closed.',
    submit: 'Confirm closure',
    submitting: 'Processing…',
    cancel: 'Cancel',
    success: 'Account closed. You will be redirected to the goodbye page.',
    error: 'Failed to close account',
    warning_header: 'This is not a trivial action',
  },
} as const;

export function CloseAccountSection({ locale = 'id' }: CloseAccountSectionProps) {
  const { getAuthHeaders } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const copy = COPY[locale];

  async function handleClose() {
    if (!reason.trim() || !acknowledged) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/client/close-account', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim(), confirm: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.push({ tone: 'success', title: copy.success });
        // Backend sudah revoke token, clear cookies di response, FE redirect.
        router.replace('/');
      } else {
        toast.push({
          tone: 'error',
          title: copy.error,
          description: data.code || data.error || `HTTP ${res.status}`,
        });
      }
    } catch (err) {
      toast.push({
        tone: 'error',
        title: copy.error,
        description: err instanceof Error ? err.message : 'network error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            {copy.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{copy.subtitle}</p>
          <Button variant="destructive" onClick={() => setOpen(true)} className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            {copy.cta_open}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => !submitting && setOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              {copy.dialog_title}
            </DialogTitle>
            <DialogDescription>{copy.dialog_desc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-destructive/30 bg-destructive/[0.06] p-3 text-xs leading-relaxed">
              <p className="font-medium text-destructive mb-1">{copy.warning_header}</p>
              <p className="text-foreground/70">{copy.dialog_desc}</p>
            </div>
            <label className="block text-sm font-medium">
              {copy.reason_label.replace('{len}', String(reason.length))}
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={512}
              placeholder={copy.reason_placeholder}
            />
            <label className="flex items-start gap-2.5 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border focus:ring-2 focus:ring-destructive"
              />
              <span className="text-foreground/85 leading-snug">{copy.confirm_label}</span>
            </label>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                {copy.cancel}
              </Button>
              <Button
                variant="destructive"
                onClick={handleClose}
                disabled={!reason.trim() || !acknowledged || submitting}
              >
                {submitting ? copy.submitting : copy.submit}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
