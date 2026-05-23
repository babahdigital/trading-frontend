'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/toast';
import { useTranslations } from 'next-intl';
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

export function CloseAccountSection({ locale = 'id' }: CloseAccountSectionProps) {
  const { getAuthHeaders } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const t = useTranslations('portal.closeAccount');

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
        toast.push({ tone: 'success', title: t('success') });
        // Backend sudah revoke token, clear cookies di response, FE redirect.
        router.replace('/');
      } else {
        toast.push({
          tone: 'error',
          title: t('error'),
          description: data.code || data.error || `HTTP ${res.status}`,
        });
      }
    } catch (err) {
      toast.push({
        tone: 'error',
        title: t('error'),
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
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{t('subtitle')}</p>
          <Button variant="destructive" onClick={() => setOpen(true)} className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            {t('cta_open')}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => !submitting && setOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              {t('dialog_title')}
            </DialogTitle>
            <DialogDescription>{t('dialog_desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-destructive/30 bg-destructive/[0.06] p-3 text-xs leading-relaxed">
              <p className="font-medium text-destructive mb-1">{t('warning_header')}</p>
              <p className="text-foreground/70">{t('dialog_desc')}</p>
            </div>
            <label className="block text-sm font-medium">
              {t('reason_label', { len: String(reason.length) })}
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={512}
              placeholder={t('reason_placeholder')}
            />
            <label className="flex items-start gap-2.5 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border focus:ring-2 focus:ring-destructive"
              />
              <span className="text-foreground/85 leading-snug">{t('confirm_label')}</span>
            </label>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                {t('cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleClose}
                disabled={!reason.trim() || !acknowledged || submitting}
              >
                {submitting ? t('submitting') : t('submit')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
