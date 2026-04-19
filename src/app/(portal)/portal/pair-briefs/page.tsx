'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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

function sessionBadge(session: string): string {
  switch (session) {
    case 'ASIAN': return 'Asian';
    case 'LONDON': return 'London';
    case 'NEW_YORK': return 'New York';
    default: return session;
  }
}

export default function PortalPairBriefsPage() {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Pair Intelligence Briefs</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Per-pair analysis with S/R levels, SND zones, and trade ideas
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse">
              <div className="h-5 w-1/3 bg-muted rounded mb-2" />
              <div className="h-4 w-2/3 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : briefs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No pair briefs available yet. Check back soon.
        </div>
      ) : (
        <div className="space-y-4">
          {briefs.map((brief) => (
            <Link
              key={brief.slug}
              href={`/research/briefs/${brief.slug}`}
              className="block border rounded-lg p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg">{brief.pair}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-muted">{sessionBadge(brief.session)}</span>
                  {brief.validationStatus && (
                    <span className={`text-xs px-2 py-0.5 rounded ${brief.validationStatus === 'PASSED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                      {brief.validationStatus}
                    </span>
                  )}
                </div>
                <span className={`text-sm font-medium ${brief.fundamentalBias === 'BULLISH' ? 'text-emerald-500' : brief.fundamentalBias === 'BEARISH' ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {brief.fundamentalBias || 'NEUTRAL'}
                </span>
              </div>

              <div className="flex gap-6 text-sm text-muted-foreground">
                {brief.supportLevels.length > 0 && (
                  <span>S: {brief.supportLevels.slice(0, 3).map(formatPrice).join(' | ')}</span>
                )}
                {brief.resistanceLevels.length > 0 && (
                  <span>R: {brief.resistanceLevels.slice(0, 3).map(formatPrice).join(' | ')}</span>
                )}
              </div>

              {brief.tradeIdeas && brief.tradeIdeas.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {brief.tradeIdeas.map((idea, i) => (
                    <span key={i} className={`text-xs px-2 py-0.5 rounded ${idea.direction === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      {idea.direction} @ {formatPrice(idea.entry)}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-2 text-xs text-muted-foreground">
                {brief.publishedAt ? new Date(brief.publishedAt).toLocaleString() : brief.date}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
