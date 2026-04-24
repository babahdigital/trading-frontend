'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Pagination } from '@/components/ui/pagination';

const PER_PAGE = 9;

interface BriefPreview {
  id: string;
  pair: string;
  session: string;
  date: string;
  slug: string;
  supportLevels: number[];
  resistanceLevels: number[];
  fundamentalBias: string | null;
  confluenceScore: number | null;
  publishedAt: string | null;
  // Full fields (only for subscribers)
  narrative?: string;
  narrative_en?: string;
  sndZones?: Array<{ type: string; high: number; low: number; tf: string }>;
  tradeIdeas?: Array<{ direction: string; entry: number; sl: number; tp: number; rationale: string }>;
}

function formatDate(dateStr: string | null, locale: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatPrice(n: number): string {
  return n >= 100 ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : n.toFixed(5);
}

function sessionLabel(session: string): string {
  switch (session) {
    case 'ASIAN': return '🌏 Asian';
    case 'LONDON': return '🇬🇧 London';
    case 'NEW_YORK': return '🇺🇸 New York';
    default: return session;
  }
}

function biasColor(bias: string | null): string {
  switch (bias) {
    case 'BULLISH': return 'text-emerald-400';
    case 'BEARISH': return 'text-red-400';
    default: return 'text-foreground/60';
  }
}

export default function PairBriefsPage() {
  const locale = useLocale();
  const isEn = locale === 'en';
  const [briefs, setBriefs] = useState<BriefPreview[]>([]);
  const [access, setAccess] = useState<string>('preview');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/public/pair-briefs?limit=100');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.briefs)) {
          setBriefs(data.briefs);
          setAccess(data.access ?? 'preview');
        }
      } catch {
        // keep empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const visibleBriefs = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return briefs.slice(start, start + PER_PAGE);
  }, [briefs, page]);

  function handlePageChange(next: number) {
    setPage(next);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">Pair Intelligence</p>
            <h1 className="t-display-page mb-6">
              {isEn ? 'Pair Intelligence Briefs' : 'Laporan Intelijen Per Pair'}
            </h1>
            <p className="t-lead text-foreground/60 max-w-2xl">
              {isEn
                ? 'Actionable per-pair analysis with S/R levels, SND zones, patterns, and trade ideas — powered by real-time data.'
                : 'Analisis per pair yang actionable dengan level S/R, zona SND, pola, dan ide trading — didukung data real-time.'}
            </p>
            {access === 'preview' && (
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                {isEn
                  ? 'You are viewing preview mode. Subscribe for full analysis.'
                  : 'Anda melihat mode preview. Berlangganan untuk analisis lengkap.'}
                <Link href="/register/signal" className="underline font-medium">
                  {isEn ? 'Subscribe' : 'Berlangganan'}
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Briefs Grid */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card-enterprise animate-pulse">
                    <div className="h-4 w-24 bg-white/10 rounded mb-3" />
                    <div className="h-6 w-1/2 bg-white/10 rounded mb-4" />
                    <div className="h-4 w-full bg-white/10 rounded mb-2" />
                    <div className="h-4 w-3/4 bg-white/10 rounded mb-2" />
                    <div className="h-4 w-2/3 bg-white/10 rounded" />
                  </div>
                ))}
              </div>
            ) : briefs.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-foreground/40 text-lg">
                  {isEn
                    ? 'No pair briefs published yet. Check back soon.'
                    : 'Belum ada laporan pair yang dipublikasikan. Cek kembali nanti.'}
                </p>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleBriefs.map((brief) => (
                  <Link
                    key={brief.slug}
                    href={`/${locale}/research/briefs/${brief.slug}`}
                    className="card-enterprise flex flex-col group cursor-pointer hover:border-amber-500/20 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="t-eyebrow">{brief.pair}</span>
                      <span className="text-xs text-foreground/40">{sessionLabel(brief.session)}</span>
                    </div>

                    <h2 className="text-lg font-medium mb-3 group-hover:text-amber-400 transition-colors">
                      {brief.pair} — {sessionLabel(brief.session)}
                    </h2>

                    <div className="space-y-2 mb-4 flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground/50">{isEn ? 'Bias' : 'Bias'}:</span>
                        <span className={`font-medium ${biasColor(brief.fundamentalBias)}`}>
                          {brief.fundamentalBias || 'N/A'}
                        </span>
                      </div>

                      {brief.supportLevels.length > 0 && (
                        <div className="text-sm">
                          <span className="text-foreground/50">S: </span>
                          <span className="text-emerald-400/80 font-mono text-xs">
                            {brief.supportLevels.slice(0, 3).map(formatPrice).join(' | ')}
                          </span>
                        </div>
                      )}

                      {brief.resistanceLevels.length > 0 && (
                        <div className="text-sm">
                          <span className="text-foreground/50">R: </span>
                          <span className="text-red-400/80 font-mono text-xs">
                            {brief.resistanceLevels.slice(0, 3).map(formatPrice).join(' | ')}
                          </span>
                        </div>
                      )}

                      {access === 'preview' && (
                        <p className="text-xs text-amber-400/60 mt-2 italic">
                          {isEn ? 'Subscribe for full analysis' : 'Berlangganan untuk analisis lengkap'}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-foreground/40 pt-4 border-t border-white/[0.04]">
                      <span>{formatDate(brief.publishedAt, locale)}</span>
                      {brief.confluenceScore && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-foreground/20" />
                          <span>Conf: {Number(brief.confluenceScore).toFixed(2)}</span>
                        </>
                      )}
                    </div>
                  </Link>
                ))}
                </div>
                <Pagination
                  page={page}
                  total={briefs.length}
                  perPage={PER_PAGE}
                  onPageChange={handlePageChange}
                  labels={{
                    prev: isEn ? 'Prev' : 'Sebelumnya',
                    next: isEn ? 'Next' : 'Berikutnya',
                    page: isEn ? 'Page' : 'Halaman',
                    of: isEn ? 'of' : 'dari',
                  }}
                />
              </>
            )}
          </div>
        </section>

        {/* Back to Research */}
        <section className="section-padding">
          <div className="container-default px-6 text-center">
            <Link
              href={`/${locale}/research`}
              className="text-sm text-foreground/40 hover:text-foreground/60 transition-colors"
            >
              &larr; {isEn ? 'Back to Research & Insights' : 'Kembali ke Riset & Analisis'}
            </Link>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
