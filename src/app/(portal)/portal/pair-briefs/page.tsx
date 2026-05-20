'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { formatDateTime } from '@/lib/format-locale';
import type { Locale } from '@/lib/format-locale';
import { BookOpen } from 'lucide-react';

interface Brief {
  id: string;
  pair: string;
  session: string;
  date: string;
  slug: string;
  supportLevels: number[];
  resistanceLevels: number[];
  fundamentalBias: string | null;
  confluenceScore: number | null;
  narrative?: string;
  tradeIdeas?: Array<{ direction: string; entry: number; sl: number; tp: number; rationale: string }>;
  validationStatus?: string;
  publishedAt: string | null;
}

function formatPrice(n: number): string {
  return n >= 100 ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : n.toFixed(5);
}

export default function PortalPairBriefsPage() {
  const t = useTranslations('portal.pair_briefs');
  const locale = useLocale() as Locale;
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);

  function sessionBadge(session: string): string {
    switch (session) {
      case 'ASIAN': return t('session_asian');
      case 'LONDON': return t('session_london');
      case 'NEW_YORK': return t('session_new_york');
      default: return session;
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/public/pair-briefs?limit=30');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.briefs)) setBriefs(data.briefs);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="portal-page-stack">
      <PageHeader title={t('title')} description={t('subtitle')} />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse">
              <div className="h-5 w-1/3 bg-muted rounded mb-2" />
              <div className="h-4 w-2/3 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : briefs.length === 0 ? (
        <EmptyState icon={BookOpen} title={t('empty')} />
      ) : (
        <div className="space-y-4">
          {briefs.map((brief) => (
            <Link
              key={brief.slug}
              href={`/research/briefs/${brief.slug}`}
              className="block border rounded-lg p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-bold text-lg">{brief.pair}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-muted">{sessionBadge(brief.session)}</span>
                  {brief.validationStatus && (
                    <span className={`text-xs px-2 py-0.5 rounded ${brief.validationStatus === 'PASSED' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'}`}>
                      {brief.validationStatus}
                    </span>
                  )}
                </div>
                <span className={`text-sm font-medium ${brief.fundamentalBias === 'BULLISH' ? 'text-emerald-600 dark:text-emerald-400' : brief.fundamentalBias === 'BEARISH' ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}`}>
                  {brief.fundamentalBias || t('bias_neutral')}
                </span>
              </div>

              <div className="flex gap-6 text-sm text-muted-foreground flex-wrap">
                {brief.supportLevels.length > 0 && (
                  <span>S: {brief.supportLevels.slice(0, 3).map(formatPrice).join(' | ')}</span>
                )}
                {brief.resistanceLevels.length > 0 && (
                  <span>R: {brief.resistanceLevels.slice(0, 3).map(formatPrice).join(' | ')}</span>
                )}
              </div>

              {brief.tradeIdeas && brief.tradeIdeas.length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {brief.tradeIdeas.map((idea, i) => (
                    <span key={i} className={`text-xs px-2 py-0.5 rounded ${idea.direction === 'BUY' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'}`}>
                      {idea.direction} @ {formatPrice(idea.entry)}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-2 text-xs text-muted-foreground">
                {brief.publishedAt ? formatDateTime(brief.publishedAt, locale) : brief.date}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
