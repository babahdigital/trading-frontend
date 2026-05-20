'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { ArrowLeft, Shield, Settings2, Zap } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { formatDate } from '@/lib/format-locale';
import type { Locale } from '@/lib/format-locale';

interface StatusData {
  bot_status?: string;
  active_pairs?: number;
  ai_state_by_pair?: Record<string, {
    runtime_status_label?: string;
    pair?: string;
  }>;
  code_version?: string;
  license_status?: string;
  license_expiry?: string;
}

export default function MyVpsSettingsPage() {
  const t = useTranslations('portal.vps.settings');
  const locale = useLocale() as Locale;
  const { getAuthHeaders } = useAuth();
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/client/status', { headers: getAuthHeaders() });
        if (res.status === 401) { window.location.href = '/login'; return; }
        if (res.ok) setStatus(await res.json());
      } catch { /* handled */ }
      finally { setLoading(false); }
    }
    fetchStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pairs = status?.ai_state_by_pair ? Object.keys(status.ai_state_by_pair) : [];

  return (
    <div className="portal-page-stack">
      <PageHeader
        title={t('heading')}
        description={t('tagline')}
        eyebrow={
          <Link href="/portal/my-vps" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
            <ArrowLeft className="w-3 h-3" /> {t('back')}
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 rounded bg-muted animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Active Pairs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4" /> {t('active_pairs_title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pairs.length === 0 ? (
                <EmptyState variant="inline" title={t('no_active_pairs')} size="sm" />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {pairs.map((pair) => (
                    <span key={pair} className="px-3 py-1.5 rounded-md bg-primary/10 text-primary text-sm font-mono font-medium">
                      {pair}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Risk Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="w-4 h-4" /> {t('risk_params_title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label={t('row_risk_management')} value={t('row_risk_management_value')} />
                <InfoRow label={t('row_max_positions')} value={t('row_max_positions_value')} />
                <InfoRow label={t('row_stop_loss')} value={t('row_stop_loss_value')} />
                <InfoRow label={t('row_take_profit')} value={t('row_take_profit_value')} />
              </div>
              <div className="mt-4 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-300">
                {t('risk_note')}
              </div>
            </CardContent>
          </Card>

          {/* Bot Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> {t('bot_info_title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label={t('row_bot_version')} value={status?.code_version || '-'} />
                <InfoRow label={t('row_bot_status')} value={status?.bot_status || '-'} />
                <InfoRow label={t('row_license_status')} value={status?.license_status || '-'} />
                <InfoRow
                  label={t('row_license_expiry')}
                  value={status?.license_expiry
                    ? formatDate(status.license_expiry, locale, { day: 'numeric', month: 'long', year: 'numeric' })
                    : '-'
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Admin */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  {t('contact_admin_text')}
                </p>
                <Link href="/portal/my-vps/support">
                  <Button variant="outline" size="sm">{t('contact_admin_cta')}</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn('flex justify-between items-center p-3 rounded-lg border')}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium font-mono">{value}</span>
    </div>
  );
}
