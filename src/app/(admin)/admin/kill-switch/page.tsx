'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AlertTriangle, Zap } from 'lucide-react';
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

  async function fetchEvents() {
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
  }

  useEffect(() => { fetchEvents(); }, []);

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
        fetchEvents();
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
