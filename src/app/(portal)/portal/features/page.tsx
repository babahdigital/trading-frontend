'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Sparkles, Lock, RefreshCw, ArrowUpRight, BarChart3, Brain, Target, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { type CapabilityTier, tierLabel, tierIncludes, CAPABILITY_TIER_ORDER } from '@/lib/capabilities/tier-mapping';

interface FeatureItem {
  name: string;
  category: 'indicator' | 'strategy' | 'ai_subsystem';
  enabled: boolean;
  tier_allows: boolean;
  requires_tier: CapabilityTier;
  description: string;
}

interface TenantFeaturesResponse {
  source?: 'backend' | 'fallback';
  tenant_id: string;
  tier: CapabilityTier;
  indicators: FeatureItem[];
  strategies: FeatureItem[];
  ai_subsystems: FeatureItem[];
}

type Bucket = 'indicators' | 'strategies' | 'ai_subsystems';

const SECTION_META: Record<Bucket, { labelKey: string; icon: typeof BarChart3; color: string }> = {
  indicators: { labelKey: 'section_indicators', icon: BarChart3, color: 'text-sky-300' },
  strategies: { labelKey: 'section_strategies', icon: Target, color: 'text-emerald-300' },
  ai_subsystems: { labelKey: 'section_ai_subsystems', icon: Brain, color: 'text-amber-300' },
};

function ToggleSwitch({
  checked,
  disabled,
  onChange,
  label,
  pending,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
  label: string;
  pending: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled || pending}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        disabled
          ? 'cursor-not-allowed bg-white/5 opacity-50'
          : checked
            ? 'bg-amber-500'
            : 'bg-white/10 hover:bg-white/15',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
          pending && 'animate-pulse',
        )}
      />
    </button>
  );
}

function UpgradeModal({
  open,
  onClose,
  feature,
  currentTier,
  requiredTier,
}: {
  open: boolean;
  onClose: () => void;
  feature: string | null;
  currentTier: CapabilityTier;
  requiredTier: CapabilityTier;
}) {
  const t = useTranslations('portal.features');
  if (!open || !feature) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-amber-500/30 rounded-xl max-w-md w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="rounded-lg bg-amber-500/15 p-2 shrink-0">
            <Lock className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold leading-tight">{t('modal_title', { tier: tierLabel(requiredTier) })}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">{feature}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-2">
          {t('modal_current_tier')} <span className="font-semibold text-foreground">{tierLabel(currentTier)}</span>
        </p>
        <p className="text-sm text-muted-foreground mb-5">
          {t('modal_explain', { tier: tierLabel(requiredTier) })}
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('modal_later')}
          </Button>
          <Button size="sm" asChild className="bg-amber-500 hover:bg-amber-400 text-black">
            <Link href="/pricing">
              {t('modal_view_plans')} <ArrowUpRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({
  item,
  bucket,
  pending,
  onToggle,
}: {
  item: FeatureItem;
  bucket: Bucket;
  pending: boolean;
  onToggle: (bucket: Bucket, name: string, desired: boolean) => void;
}) {
  const t = useTranslations('portal.features');
  const locked = !item.tier_allows;
  return (
    <div
      className={cn(
        'flex items-start gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded-lg border transition-colors',
        locked
          ? 'border-white/[0.06] bg-white/[0.015] opacity-70'
          : 'border-white/10 bg-card hover:border-white/20',
      )}
    >
      <ToggleSwitch
        checked={item.enabled}
        disabled={locked}
        pending={pending}
        label={t('toggle_aria', { name: item.name })}
        onChange={() => onToggle(bucket, item.name, !item.enabled)}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-sm font-mono font-medium text-foreground/90">{item.name}</code>
          {locked && (
            <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-[10px] uppercase tracking-wider">
              <Lock className="h-3 w-3 mr-1" />
              {t('upgrade_badge', { tier: tierLabel(item.requires_tier) })}
            </Badge>
          )}
          {!locked && item.requires_tier !== 'beta' && (
            <Badge variant="outline" className="border-white/10 text-muted-foreground text-[10px] uppercase tracking-wider">
              {tierLabel(item.requires_tier)}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
      </div>
    </div>
  );
}

export default function PortalFeaturesPage() {
  const t = useTranslations('portal.features');
  const tShared = useTranslations('portal.shared');
  const { getAuthHeaders } = useAuth();
  const toast = useToast();

  const [data, setData] = useState<TenantFeaturesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [upgradeModal, setUpgradeModal] = useState<{ feature: string; required: CapabilityTier } | null>(null);
  const [activeBucket, setActiveBucket] = useState<Bucket>('indicators');

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/client/tenant/features', { headers: getAuthHeaders() });
      if (res.ok) {
        const body = (await res.json()) as TenantFeaturesResponse;
        setData(body);
      } else if (res.status === 401) {
        toast.push({ tone: 'error', title: tShared('session_expired_title'), description: tShared('session_expired_desc') });
      } else {
        toast.push({ tone: 'error', title: t('fetch_failed_title'), description: t('fetch_failed_desc', { status: res.status }) });
      }
    } catch (err) {
      toast.push({ tone: 'error', title: tShared('network_error'), description: err instanceof Error ? err.message : 'unknown' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeaders, toast, t, tShared]);

  useEffect(() => {
    load();
  }, [load]);

  const onToggle = useCallback(
    async (bucket: Bucket, name: string, desired: boolean) => {
      if (!data) return;
      const key = `${bucket}:${name}`;

      // Optimistic flip
      setPendingKeys((prev) => new Set(prev).add(key));
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [bucket]: prev[bucket].map((it) => (it.name === name ? { ...it, enabled: desired } : it)),
        };
      });

      try {
        const res = await fetch('/api/client/tenant/features', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ [bucket]: { [name]: desired } }),
        });

        if (res.status === 403) {
          // Revert + show upgrade modal per CAPABILITIES_API_GUIDE §1.3
          const body = await res.json().catch(() => ({}));
          const detail = (body?.detail ?? body) as { code?: string; feature?: string; requires_tier?: CapabilityTier };
          setData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              [bucket]: prev[bucket].map((it) => (it.name === name ? { ...it, enabled: !desired } : it)),
            };
          });
          if (detail.code === 'TIER_FORBIDDEN' && detail.requires_tier) {
            setUpgradeModal({ feature: name, required: detail.requires_tier });
          } else {
            toast.push({ tone: 'warning', title: t('not_allowed_title'), description: t('not_allowed_desc', { name }) });
          }
          return;
        }

        if (!res.ok) {
          // Revert on other errors
          setData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              [bucket]: prev[bucket].map((it) => (it.name === name ? { ...it, enabled: !desired } : it)),
            };
          });
          toast.push({ tone: 'error', title: t('save_failed_title'), description: t('fetch_failed_desc', { status: res.status }) });
          return;
        }

        const updated = (await res.json()) as TenantFeaturesResponse;
        setData(updated);
        toast.push({
          tone: 'success',
          title: desired ? t('feature_enabled') : t('feature_disabled'),
          description: name,
          durationMs: 2500,
        });
      } catch (err) {
        // Revert on network error
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            [bucket]: prev[bucket].map((it) => (it.name === name ? { ...it, enabled: !desired } : it)),
          };
        });
        toast.push({ tone: 'error', title: tShared('network_error'), description: err instanceof Error ? err.message : 'unknown' });
      } finally {
        setPendingKeys((prev) => {
          const n = new Set(prev);
          n.delete(key);
          return n;
        });
      }
    },
    [data, getAuthHeaders, toast, t, tShared],
  );

  const stats = useMemo(() => {
    if (!data) return null;
    const all = [...data.indicators, ...data.strategies, ...data.ai_subsystems];
    const enabled = all.filter((it) => it.enabled).length;
    const allowed = all.filter((it) => it.tier_allows).length;
    const locked = all.length - allowed;
    return { enabled, allowed, locked, total: all.length };
  }, [data]);

  const tier = data?.tier ?? 'beta';
  const nextTier: CapabilityTier | null = useMemo(() => {
    const idx = CAPABILITY_TIER_ORDER.indexOf(tier);
    if (idx < 0 || idx >= CAPABILITY_TIER_ORDER.length - 1) return null;
    return CAPABILITY_TIER_ORDER[idx + 1];
  }, [tier]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-amber-400" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm sm:text-base max-w-2xl">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data?.source === 'fallback' && (
            <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300">
              {tShared('local_fallback_badge')}
            </span>
          )}
          <Button size="sm" variant="outline" onClick={load} disabled={refreshing}>
            <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} /> {tShared('refresh')}
          </Button>
        </div>
      </div>

      {/* Tier banner */}
      {data && (
        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/[0.04] to-transparent">
          <CardContent className="p-4 sm:p-5 flex items-start sm:items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-1">{t('active_tier_label')}</div>
              <div className="text-lg sm:text-xl font-semibold text-foreground">{tierLabel(tier)}</div>
              {stats && (
                <div className="text-xs text-muted-foreground mt-1.5">
                  {t('stats_summary', { enabled: stats.enabled, allowed: stats.allowed, locked: stats.locked })}
                </div>
              )}
            </div>
            {nextTier && (
              <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-400 text-black">
                <Link href="/pricing">
                  {t('upgrade_to', { tier: tierLabel(nextTier) })} <ArrowUpRight className="h-4 w-4 ml-1.5" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section tabs */}
      <div className="inline-flex rounded-md border border-white/10 bg-card p-0.5 text-xs flex-wrap">
        {(Object.keys(SECTION_META) as Bucket[]).map((b) => {
          const meta = SECTION_META[b];
          const Icon = meta.icon;
          const count = data?.[b]?.length ?? 0;
          return (
            <button
              key={b}
              type="button"
              onClick={() => setActiveBucket(b)}
              className={cn(
                'px-3 py-1.5 rounded font-mono uppercase transition-colors flex items-center gap-1.5',
                activeBucket === b ? 'bg-amber-500/15 text-amber-300' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(meta.labelKey)}
              <span className="ml-0.5 text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <div className="space-y-2">
          {data[activeBucket].length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {t('category_empty')}
              </CardContent>
            </Card>
          ) : (
            data[activeBucket].map((item) => {
              const key = `${activeBucket}:${item.name}`;
              return (
                <FeatureRow
                  key={item.name}
                  item={item}
                  bucket={activeBucket}
                  pending={pendingKeys.has(key)}
                  onToggle={onToggle}
                />
              );
            })
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 mx-auto opacity-40 mb-2" />
            {t('load_data_failed')}
          </CardContent>
        </Card>
      )}

      {/* Tier ladder hint */}
      {data && (
        <Card className="border-white/10">
          <CardContent className="p-4 sm:p-5">
            <div className="text-xs uppercase tracking-wider font-mono text-muted-foreground mb-3">{t('tier_ladder')}</div>
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              {CAPABILITY_TIER_ORDER.map((tt, i) => {
                const reached = tierIncludes(tier, tt);
                const isCurrent = tier === tt;
                return (
                  <div key={tt} className="flex items-center gap-1 sm:gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-mono uppercase tracking-wider',
                        isCurrent
                          ? 'bg-amber-500 text-black font-semibold'
                          : reached
                            ? 'bg-amber-500/10 text-amber-300'
                            : 'bg-white/5 text-muted-foreground',
                      )}
                    >
                      {tierLabel(tt)}
                    </span>
                    {i < CAPABILITY_TIER_ORDER.length - 1 && (
                      <span className={cn('text-[10px]', reached ? 'text-amber-400/50' : 'text-white/15')}>›</span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <UpgradeModal
        open={upgradeModal !== null}
        onClose={() => setUpgradeModal(null)}
        feature={upgradeModal?.feature ?? null}
        currentTier={tier}
        requiredTier={upgradeModal?.required ?? 'starter'}
      />
    </div>
  );
}
