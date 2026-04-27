'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Sparkles, Lock, ArrowUpRight, X, Moon, Brain, Zap } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { type CapabilityTier, tierLabel, CAPABILITY_TIER_ORDER } from '@/lib/capabilities/tier-mapping';
import { cn } from '@/lib/utils';

/**
 * Discovery banner per CAPABILITIES_API_GUIDE §2.3.
 *
 * Surfaces ONE compelling locked feature for the user's tier as upgrade nudge.
 * Priority order: AI subsystems > strategies > indicators (highest perceived value first).
 * Caps to next tier above current — never shows skipping (e.g. starter user won't see VIP-only).
 *
 * Dismissal persists in localStorage per featureName, so we don't nag.
 */

interface FeatureItem {
  name: string;
  category: 'indicator' | 'strategy' | 'ai_subsystem';
  enabled: boolean;
  tier_allows: boolean;
  requires_tier: CapabilityTier;
  description: string;
}

interface TenantFeaturesResponse {
  tier: CapabilityTier;
  indicators: FeatureItem[];
  strategies: FeatureItem[];
  ai_subsystems: FeatureItem[];
}

const HIGHLIGHT_BY_NAME: Record<string, { icon: typeof Sparkles; taglineKey: string }> = {
  astronacci_lunar_phase: { icon: Moon, taglineKey: 'tagline_astronacci_lunar_phase' },
  astronacci_planetary: { icon: Sparkles, taglineKey: 'tagline_astronacci_planetary' },
  'astronacci.moon_reversal': { icon: Moon, taglineKey: 'tagline_astronacci_moon_reversal' },
  weekly_retrospect: { icon: Brain, taglineKey: 'tagline_weekly_retrospect' },
  entry_veto_mode: { icon: Brain, taglineKey: 'tagline_entry_veto_mode' },
  news_momentum: { icon: Zap, taglineKey: 'tagline_news_momentum' },
};

function pickHighlight(data: TenantFeaturesResponse): { item: FeatureItem; bucket: string } | null {
  const currentRank = CAPABILITY_TIER_ORDER.indexOf(data.tier);
  // Only pick items at the next tier (encourage upgrade by 1 step)
  const nextTier = CAPABILITY_TIER_ORDER[currentRank + 1];
  if (!nextTier) return null;

  const all: { item: FeatureItem; bucket: string; priority: number }[] = [
    ...data.ai_subsystems.map((it) => ({ item: it, bucket: 'AI', priority: 3 })),
    ...data.strategies.map((it) => ({ item: it, bucket: 'Strategy', priority: 2 })),
    ...data.indicators.map((it) => ({ item: it, bucket: 'Indicator', priority: 1 })),
  ];

  // Filter to locked + at the next tier exactly
  const candidates = all.filter((c) => !c.item.tier_allows && c.item.requires_tier === nextTier);
  if (candidates.length === 0) return null;

  // Prefer named highlights first
  const namedMatch = candidates.find((c) => HIGHLIGHT_BY_NAME[c.item.name]);
  if (namedMatch) return { item: namedMatch.item, bucket: namedMatch.bucket };

  // Else highest-priority bucket (AI > Strategy > Indicator), take first
  candidates.sort((a, b) => b.priority - a.priority);
  return { item: candidates[0].item, bucket: candidates[0].bucket };
}

const DISMISS_KEY_PREFIX = 'babahalgo:discovery-dismissed:';

export function DiscoveryBanner() {
  const t = useTranslations('portal.discovery_banner');
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<TenantFeaturesResponse | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/client/tenant/features', { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: TenantFeaturesResponse | null) => {
        if (!cancelled && body) setData(body);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [getAuthHeaders]);

  const highlight = data ? pickHighlight(data) : null;

  useEffect(() => {
    if (!highlight || typeof window === 'undefined') return;
    try {
      const key = DISMISS_KEY_PREFIX + highlight.item.name;
      setDismissed(window.localStorage.getItem(key) === '1');
    } catch {
      /* storage disabled */
    }
  }, [highlight]);

  if (!data || !highlight || dismissed) return null;

  const meta = HIGHLIGHT_BY_NAME[highlight.item.name];
  const Icon = meta?.icon ?? Sparkles;
  const tagline = meta?.taglineKey ? t(meta.taglineKey) : highlight.item.description;

  const onDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(DISMISS_KEY_PREFIX + highlight.item.name, '1');
      } catch {
        /* storage disabled */
      }
    }
  };

  return (
    <div
      className={cn(
        'relative rounded-xl border border-amber-500/30 p-4 sm:p-5',
        'bg-gradient-to-br from-amber-500/[0.08] via-amber-500/[0.03] to-transparent',
      )}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('dismiss_aria')}
        className="absolute top-2 right-2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 sm:gap-4 pr-8">
        <div className="rounded-lg bg-amber-500/15 border border-amber-500/30 p-2.5 shrink-0">
          <Icon className="h-5 w-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider font-mono text-amber-300/80">
              {highlight.bucket} · {tierLabel(highlight.item.requires_tier)}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              <Lock className="h-3 w-3" />
              {t('locked')}
            </span>
          </div>
          <h3 className="font-semibold text-sm sm:text-base leading-tight mb-1">
            <code className="font-mono text-amber-200">{highlight.item.name}</code>
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-3">{tagline}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition-colors"
            >
              {t('upgrade_cta', { tier: tierLabel(highlight.item.requires_tier) })}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/portal/features"
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              {t('see_all_features')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
