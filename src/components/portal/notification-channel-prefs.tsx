'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Mail, MessageCircle, Send, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';

/**
 * Notification Channel Preferences (kill-switch only)
 *
 * GET  /api/client/kill-switch/preferences -> { channels: [...] }
 * PATCH same endpoint -> { channels: [...] }  min 1, max 3
 *
 * Three checkboxes: email, telegram, whatsapp.
 * Renders the platform-level WhatsApp gate banner per
 * docs/notifications_phase2_runtime_2026-04-27.md.
 */

type Channel = 'email' | 'telegram' | 'whatsapp';

interface PreferencesResponse {
  source?: string;
  channels: string[];
}

const CHANNEL_DEFS: { id: Channel; labelKey: string; icon: typeof Mail }[] = [
  { id: 'email', labelKey: 'channel_email', icon: Mail },
  { id: 'telegram', labelKey: 'channel_telegram', icon: Send },
  { id: 'whatsapp', labelKey: 'channel_whatsapp', icon: MessageCircle },
];

function normalize(list: unknown): Channel[] {
  if (!Array.isArray(list)) return [];
  const allowed = new Set<Channel>(['email', 'telegram', 'whatsapp']);
  const out: Channel[] = [];
  for (const c of list) {
    if (typeof c !== 'string') continue;
    const lc = c.toLowerCase() as Channel;
    if (allowed.has(lc) && !out.includes(lc)) out.push(lc);
  }
  return out;
}

export function NotificationChannelPrefs() {
  const t = useTranslations('portal.notif_prefs');
  const { getAuthHeaders } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchPrefs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/client/kill-switch/preferences', {
        headers: getAuthHeaders(),
        cache: 'no-store',
      });
      if (!res.ok) return;
      const body = (await res.json()) as PreferencesResponse;
      setChannels(normalize(body.channels));
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    void fetchPrefs();
  }, [fetchPrefs]);

  const toggle = (id: Channel) => {
    setSavedFlash(false);
    setError('');
    setChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const save = useCallback(async () => {
    if (channels.length === 0) {
      setError(t('min_one_channel'));
      return;
    }
    setSaving(true);
    setError('');
    setSavedFlash(false);
    try {
      const res = await fetch('/api/client/kill-switch/preferences', {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
        setError(body.error || body.code || 'save_failed');
        return;
      }
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 3000);
    } finally {
      setSaving(false);
    }
  }, [channels, getAuthHeaders, t]);

  const minError = channels.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('channels_title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('channels_subtitle')}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Platform-level WhatsApp gate banner */}
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200/90 leading-relaxed">
            {t('whatsapp_gate_banner')}
          </p>
        </div>

        {/* Channel checkboxes */}
        <div className="grid gap-2 sm:grid-cols-3">
          {CHANNEL_DEFS.map((c) => {
            const active = channels.includes(c.id);
            const Icon = c.icon;
            return (
              <label
                key={c.id}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md border cursor-pointer transition-colors',
                  'focus-within:ring-2 focus-within:ring-amber-400/40',
                  active
                    ? 'border-amber-400/50 bg-amber-400/10 text-amber-200'
                    : 'border-border bg-background hover:bg-accent/40',
                )}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggle(c.id)}
                  className="h-4 w-4 rounded border-border text-amber-500 focus:ring-amber-400 focus:ring-offset-0"
                  disabled={loading || saving}
                />
                <Icon className={cn('h-4 w-4', active ? 'text-amber-300' : 'text-muted-foreground')} />
                <span className="text-sm font-medium">{t(c.labelKey)}</span>
              </label>
            );
          })}
        </div>

        {/* Min-one error */}
        {(minError || error) && (
          <p className="text-sm text-red-400 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" />
            {error || t('min_one_channel')}
          </p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <Button onClick={save} disabled={loading || saving || minError}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('save')}
              </>
            ) : (
              t('save')
            )}
          </Button>
          {savedFlash && (
            <span className="text-sm text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              {t('saved')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default NotificationChannelPrefs;
