'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
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
        setSuccess('Kill switch triggered successfully.');
        setLicenseId('');
        setConfirmStep(false);
        void fetchEvents();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to trigger kill switch');
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
      setResolveError('Event ID is required.');
      return;
    }
    if (!trimmedReason) {
      setResolveError('Reason is required.');
      return;
    }
    if (trimmedReason.length > 512) {
      setResolveError('Reason must be at most 512 characters.');
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
          setResolveError('Event already resolved or not found.');
        } else if (res.status === 422) {
          setResolveError(data.error || 'Validation failed (reason required, ≤512 chars).');
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
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Kill Switch</h2>
        <p className="text-muted-foreground">Emergency license termination events</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Manual Kill Switch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground">License ID</label>
              <Input
                value={licenseId}
                onChange={(e) => { setLicenseId(e.target.value); setConfirmStep(false); }}
                placeholder="Enter license ID to terminate"
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
                {submitting ? 'Triggering...' : confirmStep ? 'CONFIRM KILL' : 'TRIGGER KILL SWITCH'}
              </Button>
            </div>
          </div>
          {confirmStep && (
            <p className="mt-2 text-sm text-yellow-400">
              Are you sure? This will immediately terminate the license. Click &quot;CONFIRM KILL&quot; to proceed.
            </p>
          )}
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          {success && <p className="mt-2 text-sm text-green-400">{success}</p>}
        </CardContent>
      </Card>

      {/* Forex kill-switch admin resolve — Sprint 11.4 P2 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            Resolve Forex Kill-Switch Event
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
                {resolveSubmitting ? 'Resolving...' : 'Resolve Event'}
              </Button>
              {resolveSuccess && (
                <span className="text-sm text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  {resolveSuccess}
                </span>
              )}
            </div>
            {resolveError && <p className="text-sm text-red-400">{resolveError}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kill Switch Events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium text-muted-foreground">Time</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">License Key</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Triggered By</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Success</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Error</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Loading...</td></tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No kill switch events recorded.</p>
                    </td>
                  </tr>
                ) : (
                  events.map((evt) => (
                    <tr key={evt.id} className="border-b hover:bg-accent/50 transition-colors">
                      <td className="p-4 text-muted-foreground whitespace-nowrap">
                        {new Date(evt.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4 font-mono text-xs">{evt.licenseKey || evt.licenseId || '-'}</td>
                      <td className="p-4">{evt.triggeredBy || '-'}</td>
                      <td className="p-4">
                        <span className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          evt.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        )}>
                          {evt.success ? 'YES' : 'NO'}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-red-400">{evt.error || '-'}</td>
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
