'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Loader2, ShieldAlert, ShieldQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';

/**
 * Kill-Switch Banner
 *
 * Polls /api/client/kill-switch/status every 30s. When the tenant has an
 * active kill-switch event, renders a sticky red banner at top of portal
 * main content with:
 *   - policy_label + triggers
 *   - countdown to self-ack (MM:SS) — derived from `seconds_until_self_ack`
 *     and decremented locally each second; refreshed on next poll.
 *   - Acknowledge CTA (disabled until countdown=0). On EQUITY_DRAWDOWN policy
 *     prompts for current_equity input.
 *   - "Contact Admin" CTA when requires_admin=true.
 *   - Inline error rendering for 409 KILL_SWITCH_EQUITY_NOT_RECOVERED
 *     (recovered_pct vs required_pct), 409 cooling, 429 rate-limited, etc.
 *
 * Hides itself when is_active=false or when the status fetch fails.
 */

interface StatusResponse {
  source?: string;
  is_active: boolean;
  event_id: string | null;
  triggers: string[];
  triggered_at: string | null;
  cooling_until: string | null;
  requires_admin: boolean;
  can_self_acknowledge: boolean;
  seconds_until_self_ack: number;
  policy_label: string | null;
}

interface AckSuccess {
  outcome: string;
  resolved_event_id: string | null;
  cooling_until: string | null;
  recovered_pct: number | null;
  required_pct: number | null;
}

interface BackendError {
  code: string;
  error?: string;
  details?: {
    cooling_until?: string;
    recovered_pct?: number;
    required_pct?: number;
  };
}

const POLICY_TO_KEY: Record<string, string> = {
  loss_streak_12h: 'policy_loss_streak',
  loss_streak: 'policy_loss_streak',
  equity_drawdown: 'policy_equity_drawdown',
  equity_drawdown_24h: 'policy_equity_drawdown',
  daily_loss: 'policy_daily_loss',
  daily_loss_midnight: 'policy_daily_loss',
  multi_trigger: 'policy_multi_trigger',
};

function policyLabelKey(policy: string | null, triggers: string[]): string {
  if (policy && POLICY_TO_KEY[policy]) return POLICY_TO_KEY[policy];
  const t = (triggers[0] || '').toLowerCase();
  if (t.includes('loss_streak')) return 'policy_loss_streak';
  if (t.includes('equity')) return 'policy_equity_drawdown';
  if (t.includes('daily')) return 'policy_daily_loss';
  if (triggers.length > 1) return 'policy_multi_trigger';
  return 'policy_multi_trigger';
}

function formatMmSs(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export function KillSwitchBanner() {
  const t = useTranslations('portal.kill_switch');
  const tErr = useTranslations('errors.kill_switch');
  const { getAuthHeaders } = useAuth();

  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [equityInput, setEquityInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const tickRef = useRef<NodeJS.Timeout | null>(null);

  const isEquityPolicy = useMemo(() => {
    const p = (status?.policy_label || '').toLowerCase();
    if (p.includes('equity')) return true;
    return (status?.triggers || []).some((tr) => tr.toLowerCase().includes('equity'));
  }, [status]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/client/kill-switch/status', {
        headers: getAuthHeaders(),
        cache: 'no-store',
      });
      if (!res.ok) {
        setFetchFailed(true);
        return;
      }
      const body = (await res.json()) as StatusResponse;
      setFetchFailed(false);
      setStatus(body);
      if (body.is_active) {
        setSecondsLeft(Math.max(0, body.seconds_until_self_ack ?? 0));
      } else {
        setSecondsLeft(0);
      }
    } catch {
      setFetchFailed(true);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    void fetchStatus();
    const id = setInterval(() => {
      void fetchStatus();
    }, 30_000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  // Local 1s countdown ticker.
  useEffect(() => {
    if (!status?.is_active) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    tickRef.current = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [status?.is_active]);

  const handleAcknowledge = useCallback(async () => {
    if (!status?.is_active) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      const body: Record<string, string> = {};
      if (isEquityPolicy && equityInput.trim().length > 0) {
        body.current_equity = equityInput.trim();
      }
      const res = await fetch('/api/client/kill-switch/acknowledge', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = payload as BackendError;
        const code = err.code || 'KILL_SWITCH_NOT_ACTIVE';
        // Build localized error with optional placeholders
        const params: Record<string, string | number> = {};
        if (err.details?.cooling_until) {
          params.available_at = new Date(err.details.cooling_until).toLocaleString();
        }
        if (typeof err.details?.recovered_pct === 'number') {
          params.recovered_pct = err.details.recovered_pct.toFixed(1);
        }
        if (typeof err.details?.required_pct === 'number') {
          params.required_pct = err.details.required_pct.toFixed(1);
        }
        try {
          setErrorMsg(tErr(code, params));
        } catch {
          setErrorMsg(err.error || code);
        }
        return;
      }
      // Success — clear banner; refresh status.
      const ok = payload as AckSuccess;
      void ok;
      setStatus({ ...(status as StatusResponse), is_active: false });
      setEquityInput('');
      void fetchStatus();
    } catch {
      setErrorMsg(tErr('KILL_SWITCH_NOT_ACTIVE'));
    } finally {
      setSubmitting(false);
    }
  }, [status, isEquityPolicy, equityInput, getAuthHeaders, tErr, fetchStatus]);

  if (fetchFailed) return null;
  if (!status || !status.is_active) return null;

  const triggerKey = policyLabelKey(status.policy_label, status.triggers);
  const triggerLabel = t(triggerKey);
  const ackDisabled = submitting || secondsLeft > 0;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'mb-5 rounded-lg border border-red-500/40 bg-red-500/10 backdrop-blur',
        'p-4 sm:p-5 shadow-lg',
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-6 w-6 shrink-0 text-red-400 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-red-200">
              {t('banner_title')}
            </h3>
            <p className="text-sm text-red-100/90 mt-1 leading-relaxed">
              {t('banner_body', { trigger_label: triggerLabel })}
            </p>
          </div>

          {/* Countdown / equity / ack row */}
          {!status.requires_admin && (
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wider font-mono text-red-200/70">
                  {t('countdown_label')}
                </span>
                <span className="text-2xl font-mono font-bold text-red-100 tabular-nums">
                  {formatMmSs(secondsLeft)}
                </span>
              </div>

              {isEquityPolicy && (
                <div className="flex flex-col gap-1 max-w-[180px]">
                  <label
                    htmlFor="ks-equity"
                    className="text-[11px] uppercase tracking-wider font-mono text-red-200/70"
                  >
                    {t('equity_input_label')}
                  </label>
                  <Input
                    id="ks-equity"
                    type="text"
                    inputMode="decimal"
                    value={equityInput}
                    onChange={(e) => setEquityInput(e.target.value)}
                    placeholder={t('equity_input_placeholder')}
                    className="bg-red-950/40 border-red-500/40 text-red-50 placeholder:text-red-300/40"
                  />
                </div>
              )}

              <Button
                variant="destructive"
                disabled={ackDisabled}
                onClick={handleAcknowledge}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('cta_acknowledge')}
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-4 w-4 mr-2" />
                    {t('cta_acknowledge')}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Admin-only override branch */}
          {status.requires_admin && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-red-100/80">
                {tErr('KILL_SWITCH_REQUIRES_ADMIN')}
              </p>
              <Button asChild variant="outline" className="border-red-400/50 text-red-100 hover:bg-red-500/20">
                <Link href="mailto:compliance@babahalgo.com">
                  <ShieldQuestion className="h-4 w-4 mr-2" />
                  {t('cta_contact_admin')}
                </Link>
              </Button>
            </div>
          )}

          {errorMsg && (
            <p className="text-sm text-red-200 border-t border-red-500/30 pt-2 mt-1">
              {errorMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default KillSwitchBanner;
