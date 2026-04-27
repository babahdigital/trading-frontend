'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Cpu, ChevronLeft, CheckCircle2, Power, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EnrolledStrategy {
  strategy_name: string;
  market_type: 'spot' | 'futures';
  enabled: boolean;
}

interface ListResponse {
  source?: 'mock' | 'backend';
  tier?: string;
  items?: EnrolledStrategy[];
}

const STRATEGY_DESC_KEYS: Record<string, string> = {
  scalping_momentum: 'desc_scalping_momentum',
  swing_smc: 'desc_swing_smc',
  wyckoff_breakout: 'desc_wyckoff_breakout',
  spot_dca_trend: 'desc_spot_dca_trend',
  spot_swing_trend: 'desc_spot_swing_trend',
  mean_reversion: 'desc_mean_reversion',
};

function fmtName(slug: string): string {
  return slug
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function CryptoStrategyPage() {
  const t = useTranslations('portal.crypto.strategy');
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/crypto/strategy/list', { headers: getAuthHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as ListResponse;
        setData(body);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'unknown error');
      } finally {
        setLoading(false);
      }
    })();
  }, [getAuthHeaders]);

  const items = data?.items ?? [];
  const enabled = items.filter((s) => s.enabled);
  const disabled = items.filter((s) => !s.enabled);
  const isMock = data?.source === 'mock';

  return (
    <div className="space-y-6">
      <Link href="/portal/crypto" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> {t('back')}
      </Link>

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Cpu className="h-6 w-6 sm:h-7 sm:w-7 text-amber-400" />
            {t('heading')}
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">
            {t('tagline_pre')} <span className="font-mono text-amber-300">{data?.tier ?? '—'}</span> {t('tagline_post')}
          </p>
        </div>
        {isMock && (
          <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300">
            {t('data_preview_badge')}
          </span>
        )}
      </div>

      {error && <div className="p-3 rounded-md border border-red-500/30 bg-red-500/5 text-red-300 text-sm">{error}</div>}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-36 rounded-md bg-white/5 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground space-y-3">
            <Cpu className="h-8 w-8 mx-auto opacity-50" />
            <p>{t('empty_body')}</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/contact?subject=crypto-strategy-enrollment">
                <Mail className="h-4 w-4 mr-2" /> {t('request_enrollment')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {enabled.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                {t('active_count', { count: enabled.length })}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {enabled.map((s) => (
                  <StrategyCard key={s.strategy_name + s.market_type} strategy={s} />
                ))}
              </div>
            </section>
          )}

          {disabled.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                {t('standby_count', { count: disabled.length })}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {disabled.map((s) => (
                  <StrategyCard key={s.strategy_name + s.market_type} strategy={s} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <Card className="bg-white/[0.02]">
        <CardContent className="p-4 text-xs text-muted-foreground leading-relaxed">
          <p className="font-medium text-foreground mb-1">{t('faq_title')}</p>
          <p>
            {t('faq_body')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StrategyCard({ strategy }: { strategy: EnrolledStrategy }) {
  const t = useTranslations('portal.crypto.strategy');
  const descKey = STRATEGY_DESC_KEYS[strategy.strategy_name];
  const desc = descKey ? t(descKey) : t('default_desc');
  return (
    <Card className={cn(strategy.enabled ? 'border-green-500/20 bg-green-500/[0.02]' : 'border-white/10')}>
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight">{fmtName(strategy.strategy_name)}</h3>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5 inline-block">
              {strategy.market_type}
            </span>
          </div>
          {strategy.enabled ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-green-500/15 text-green-300 border border-green-500/30">
              <CheckCircle2 className="h-3 w-3" /> {t('active_badge')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-500/15 text-slate-300 border border-slate-500/30">
              <Power className="h-3 w-3" /> {t('standby_badge')}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{desc}</p>
      </CardContent>
    </Card>
  );
}
