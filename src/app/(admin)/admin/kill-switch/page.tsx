'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/admin/page-header';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { formatDateTime } from '@/lib/format-locale';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth/auth-context';

interface KillSwitchEvent {
  id: string;
  createdAt: string;
  licenseKey: string | null;
  licenseId: string | null;
  triggeredBy: string | null;
  success: boolean;
  error: string | null;
}

export default function KillSwitchPage() {
  const t = useTranslations('admin.kill_switch');
  const { getAuthHeaders } = useAuth();
  const [events, setEvents] = useState<KillSwitchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [licenseId, setLicenseId] = useState('');
  const [confirmStep, setConfirmStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Forex kill-switch admin resolve (Sprint 11.4 P2).
  const [resolveEventId, setResolveEventId] = useState('');
  const [resolveReason, setResolveReason] = useState('');
  const [resolveSubmitting, setResolveSubmitting] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const [resolveSuccess, setResolveSuccess] = useState('');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/kill-switch', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events ?? data ?? []);
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    // fetchEvents drives setState — intentional fetch on mount + refetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchEvents();
  }, [fetchEvents]);

  async function handleTrigger() {
    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/kill-switch', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ licenseId }),
      });
      if (res.ok) {
        setSuccess(t('success'));
        setLicenseId('');
        setConfirmStep(false);
        void fetchEvents();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || t('error_trigger'));
        setConfirmStep(false);
      }
    } catch {
      setError('Network error');
      setConfirmStep(false);
    } finally {
      setSubmitting(false);
    }
  }

  function cancelConfirm() {
    setConfirmStep(false);
  }

  async function handleResolveForexEvent() {
    setResolveError('');
    setResolveSuccess('');
    const trimmedId = resolveEventId.trim();
    const trimmedReason = resolveReason.trim();
    if (!trimmedId) {
      setResolveError(t('error_event_required'));
      return;
    }
    if (!trimmedReason) {
      setResolveError(t('error_reason_required'));
      return;
    }
    if (trimmedReason.length > 512) {
      setResolveError(t('error_reason_max'));
      return;
    }
    setResolveSubmitting(true);
    try {
      const res = await fetch(`/api/admin/kill-switch/${encodeURIComponent(trimmedId)}/resolve`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: trimmedReason }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResolveSuccess(`Resolved event ${trimmedId} (${data.action || 'kill_switch_resolve'}).`);
        setResolveEventId('');
        setResolveReason('');
      } else {
        if (res.status === 404 || data.code === 'NOT_FOUND') {
          setResolveError(t('error_not_found'));
        } else if (res.status === 422) {
          setResolveError(data.error || t('error_validation'));
        } else {
          setResolveError(data.error || data.code || `Failed (HTTP ${res.status}).`);
        }
      }
    } catch (err) {
      setResolveError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setResolveSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('description')}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            {t('manual_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground">{t('label_license_id')}</label>
              <Input
                value={licenseId}
                onChange={(e) => { setLicenseId(e.target.value); setConfirmStep(false); }}
                placeholder={t('placeholder_license_id')}
              />
            </div>
            <div className="flex gap-2">
              {confirmStep && (
                <Button variant="outline" onClick={cancelConfirm}>
                  Cancel
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={handleTrigger}
                disabled={!licenseId.trim() || submitting}
              >
                {submitting ? t('btn_triggering') : confirmStep ? t('btn_confirm') : t('btn_trigger')}
              </Button>
            </div>
          </div>
          {confirmStep && (
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
              {t('confirm_message')}
            </p>
          )}
          {error && <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          {success && <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{success}</p>}
        </CardContent>
      </Card>

      {/* Forex kill-switch admin resolve — Sprint 11.4 P2 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            {t('resolve_title')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Admin override for active kill-switch events on the forex backend.
            Paste the <code className="text-xs">event_id</code> (UUIDv7) and a reason
            (≤512 chars). The action is recorded in the audit notes.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <label htmlFor="ks-event-id" className="text-sm font-medium text-muted-foreground">
                Event ID
              </label>
              <Input
                id="ks-event-id"
                value={resolveEventId}
                onChange={(e) => {
                  setResolveEventId(e.target.value);
                  setResolveError('');
                  setResolveSuccess('');
                }}
                placeholder="01975c3a-0f10-7e84-a5b1-..."
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label htmlFor="ks-reason" className="text-sm font-medium text-muted-foreground">
                Reason ({resolveReason.length}/512)
              </label>
              <Textarea
                id="ks-reason"
                value={resolveReason}
                onChange={(e) => {
                  setResolveReason(e.target.value);
                  setResolveError('');
                  setResolveSuccess('');
                }}
                placeholder="manual review approved by compliance"
                rows={3}
                maxLength={512}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleResolveForexEvent}
                disabled={
                  resolveSubmitting ||
                  !resolveEventId.trim() ||
                  !resolveReason.trim() ||
                  resolveReason.length > 512
                }
              >
                {resolveSubmitting ? t('btn_resolving') : t('btn_resolve')}
              </Button>
              {resolveSuccess && (
                <span className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  {resolveSuccess}
                </span>
              )}
            </div>
            {resolveError && <p className="text-sm text-rose-600 dark:text-rose-400">{resolveError}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('events_title')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="md:overflow-x-auto">
            <table className="w-full text-sm table-responsive">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium text-muted-foreground">{t('th_time')}</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">{t('th_license_key')}</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">{t('th_triggered_by')}</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">{t('th_success')}</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">{t('th_error')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td colSpan={5} className="p-4 no-label">
                        <div className="h-6 rounded bg-muted animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center no-label">
                      <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">{t('no_events')}</p>
                    </td>
                  </tr>
                ) : (
                  events.map((evt) => (
                    <tr key={evt.id} className="border-b hover:bg-accent/50 transition-colors">
                      <td className="p-4 text-muted-foreground whitespace-nowrap" data-label="Time">
                        {formatDateTime(evt.createdAt)}
                      </td>
                      <td className="p-4 font-mono text-xs" data-label="License Key">{evt.licenseKey || evt.licenseId || '-'}</td>
                      <td className="p-4" data-label="Triggered By">{evt.triggeredBy || '-'}</td>
                      <td className="p-4" data-label="Success">
                        <span className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          evt.success
                            ? 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                            : 'bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                        )}>
                          {evt.success ? 'YES' : 'NO'}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-rose-600 dark:text-rose-400" data-label="Error">{evt.error || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
