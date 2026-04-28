'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Power, PowerOff, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

/**
 * Trading Toggle
 *
 * Single ON/OFF switch on top of /api/client/trading-config.
 *  - ON  → PATCH /api/client/engines with the user's full engine allocation.
 *          Preserves the prior engine list if it was set; otherwise defaults
 *          to ["scalper","swing"] and falls back to ["scalper"] on 403
 *          TIER_FORBIDDEN (starter tier).
 *  - OFF → PATCH /api/client/engines with [].
 *
 * Tooltip clarifies that EA still manages already-open positions; only new
 * entries are paused (per backend Sprint 11.4 P2 docs).
 */

interface TradingConfig {
  source?: string;
  tenant_id: string;
  enabled_engines: string[];
  enabled_pairs: string[];
  error?: string;
}

interface BackendError {
  code: string;
  error?: string;
}

const FULL_ENGINE_SET = ['scalper', 'swing'];
const STARTER_ENGINE_SET = ['scalper'];

export function TradingToggle() {
  const t = useTranslations('portal.trading_toggle');
  const tErr = useTranslations('errors.kill_switch');
  const { getAuthHeaders } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabledEngines, setEnabledEngines] = useState<string[]>([]);
  /** Last non-empty engines seen — used as the "ON" payload when re-enabling. */
  const lastEnabledRef = useRef<string[]>(FULL_ENGINE_SET);

  const isOn = enabledEngines.length > 0;

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/client/trading-config', {
        headers: getAuthHeaders(),
        cache: 'no-store',
      });
      if (!res.ok) {
        return;
      }
      const body = (await res.json()) as TradingConfig;
      const engines = Array.isArray(body.enabled_engines) ? body.enabled_engines : [];
      setEnabledEngines(engines);
      if (engines.length > 0) {
        lastEnabledRef.current = engines;
      }
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  const patchEngines = useCallback(
    async (next: string[]): Promise<{ ok: true } | { ok: false; code: string; status: number }> => {
      const res = await fetch('/api/client/engines', {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled_engines: next }),
      });
      if (res.ok) return { ok: true };
      const payload = (await res.json().catch(() => ({}))) as BackendError;
      return { ok: false, code: payload.code || 'BACKEND_FAILED', status: res.status };
    },
    [getAuthHeaders],
  );

  const handleToggle = useCallback(async () => {
    if (saving || loading) return;
    setSaving(true);
    try {
      if (isOn) {
        // Going OFF → []
        const result = await patchEngines([]);
        if (result.ok) {
          setEnabledEngines([]);
        } else {
          toast.push({ tone: 'error', title: t('error_save') });
        }
      } else {
        // Going ON → previous list, fall back to FULL → STARTER on 403.
        const preferred = lastEnabledRef.current.length > 0 ? lastEnabledRef.current : FULL_ENGINE_SET;
        let result = await patchEngines(preferred);
        if (!result.ok && result.code === 'TIER_FORBIDDEN') {
          // Try starter-only allocation.
          result = await patchEngines(STARTER_ENGINE_SET);
          if (result.ok) {
            setEnabledEngines(STARTER_ENGINE_SET);
            lastEnabledRef.current = STARTER_ENGINE_SET;
            return;
          }
        }
        if (result.ok) {
          setEnabledEngines(preferred);
          lastEnabledRef.current = preferred;
        } else {
          // Localized message via errors.kill_switch namespace where possible.
          let msg = t('error_save');
          try {
            msg = tErr(result.code);
          } catch {
            // unknown code — keep generic
          }
          toast.push({ tone: 'error', title: msg });
        }
      }
    } finally {
      setSaving(false);
    }
  }, [isOn, saving, loading, patchEngines, toast, t, tErr]);

  const switchVisual = useMemo(() => {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={t('title')}
        onClick={handleToggle}
        disabled={saving || loading}
        className={cn(
          'relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-60',
          isOn ? 'bg-emerald-500' : 'bg-zinc-700',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform',
            isOn ? 'translate-x-7' : 'translate-x-1',
          )}
        />
      </button>
    );
  }, [isOn, saving, loading, handleToggle, t]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {isOn ? (
            <Power className="h-5 w-5 text-emerald-400" />
          ) : (
            <PowerOff className="h-5 w-5 text-muted-foreground" />
          )}
          {t('title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {(saving || loading) && (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            )}
            <div className="min-w-0">
              <p
                className={cn(
                  'text-sm font-medium truncate',
                  isOn ? 'text-emerald-300' : 'text-muted-foreground',
                )}
              >
                {isOn ? t('state_on') : t('state_off')}
              </p>
              <p className="text-xs text-muted-foreground/80 mt-1 flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{t('subtitle')}</span>
              </p>
            </div>
          </div>
          {switchVisual}
        </div>
      </CardContent>
    </Card>
  );
}

export default TradingToggle;
