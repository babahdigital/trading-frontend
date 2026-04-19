'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';

interface BriefDetail {
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
  // Full fields (subscribers only)
  sndZones?: Array<{ type: string; high: number; low: number; tf: string }>;
  keyPatterns?: Array<{ name: string; tf: string; description: string }>;
  fakeLiquidity?: Array<{ level: number; type: string; strength: number }>;
  narrative?: string;
  narrative_en?: string;
  tradeIdeas?: Array<{ direction: string; entry: number; sl: number; tp: number; rationale: string }>;
  validationStatus?: string;
}

function formatDate(dateStr: string | null, locale: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
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
    case 'ASIAN': return 'Asian Session';
    case 'LONDON': return 'London Session';
    case 'NEW_YORK': return 'New York Session';
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

/** Simple Markdown to HTML */
function renderMarkdown(md: string): string {
  return md
    .replace(/^(\|.+\|)\n(\|[-:| ]+\|)\n((?:\|.+\|\n?)*)/gm, (_match, header: string, _sep: string, body: string) => {
      const ths = header.split('|').filter(Boolean).map((c: string) => `<th class="px-3 py-2 text-left text-xs font-medium text-foreground/60 border-b border-white/10">${c.trim()}</th>`).join('');
      const rows = body.trim().split('\n').map((row: string) => {
        const tds = row.split('|').filter(Boolean).map((c: string) => `<td class="px-3 py-2 text-sm border-b border-white/[0.04]">${c.trim()}</td>`).join('');
        return `<tr>${tds}</tr>`;
      }).join('');
      return `<div class="overflow-x-auto my-6"><table class="w-full"><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table></div>`;
    })
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-10 mb-4 text-amber-400/90">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-6">$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground/90">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-6 list-decimal text-foreground/70 leading-relaxed">$2</li>')
    .replace(/^- (.+)$/gm, '<li class="ml-6 list-disc text-foreground/70 leading-relaxed">$1</li>')
    .replace(/((?:<li class="ml-6 list-disc[^>]*>.*<\/li>\n?)+)/g, '<ul class="my-4 space-y-1">$1</ul>')
    .replace(/((?:<li class="ml-6 list-decimal[^>]*>.*<\/li>\n?)+)/g, '<ol class="my-4 space-y-1">$1</ol>')
    .replace(/^---$/gm, '<hr class="border-white/10 my-8" />')
    .replace(/^(?!<[a-z])((?!^\s*$).+)$/gm, '<p class="text-foreground/70 leading-relaxed my-3">$1</p>')
    .replace(/<p[^>]*>\s*<\/p>/g, '');
}

export default function BriefDetailPage() {
  const locale = useLocale();
  const isEn = locale === 'en';
  const params = useParams();
  const slug = params.slug as string;

  const [brief, setBrief] = useState<BriefDetail | null>(null);
  const [access, setAccess] = useState<string>('preview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/public/pair-briefs/${encodeURIComponent(slug)}`);
        if (!res.ok) { setError(true); return; }
        const data = await res.json();
        if (data.error) { setError(true); return; }
        setBrief(data.brief);
        setAccess(data.access ?? 'preview');
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    if (slug) load();
  }, [slug]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        {loading ? (
          <section className="section-padding">
            <div className="container-default px-6 max-w-4xl mx-auto">
              <div className="animate-pulse space-y-4">
                <div className="h-4 w-24 bg-white/10 rounded" />
                <div className="h-8 w-3/4 bg-white/10 rounded" />
                <div className="h-4 w-1/2 bg-white/10 rounded" />
                <div className="h-px bg-white/10 my-8" />
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-4 bg-white/10 rounded" style={{ width: `${100 - i * 8}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : error || !brief ? (
          <section className="section-padding">
            <div className="container-default px-6 max-w-4xl mx-auto text-center py-16">
              <h1 className="text-2xl font-bold mb-4">
                {isEn ? 'Brief not found' : 'Laporan tidak ditemukan'}
              </h1>
              <Link href={`/${locale}/research/briefs`} className="btn-primary py-3 px-6">
                {isEn ? 'Back to Briefs' : 'Kembali ke Laporan'}
              </Link>
            </div>
          </section>
        ) : (
          <>
            {/* Header */}
            <section className="section-padding border-b border-white/8">
              <div className="container-default px-6 max-w-4xl mx-auto">
                <Link
                  href={`/${locale}/research/briefs`}
                  className="inline-flex items-center gap-2 text-sm text-foreground/40 hover:text-amber-400 transition-colors mb-6"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  {isEn ? 'Back to Briefs' : 'Kembali ke Laporan'}
                </Link>

                <p className="t-eyebrow mb-4">Pair Intelligence Brief</p>
                <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
                  {brief.pair} — {sessionLabel(brief.session)}
                </h1>
                <div className="flex items-center gap-4 text-sm text-foreground/50">
                  <span>{formatDate(brief.publishedAt, locale)}</span>
                  <span className="w-1 h-1 rounded-full bg-foreground/20" />
                  <span className={`font-medium ${biasColor(brief.fundamentalBias)}`}>
                    {brief.fundamentalBias || 'NEUTRAL'}
                  </span>
                  {brief.confluenceScore && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-foreground/20" />
                      <span>Confluence: {Number(brief.confluenceScore).toFixed(2)}</span>
                    </>
                  )}
                </div>
              </div>
            </section>

            {/* Key Levels — always visible */}
            <section className="section-padding border-b border-white/8">
              <div className="container-default px-6 max-w-4xl mx-auto">
                <h2 className="text-xl font-semibold mb-6 text-amber-400/90">
                  {isEn ? 'Key Levels' : 'Level Kunci'}
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="card-enterprise">
                    <h3 className="text-sm font-medium text-emerald-400 mb-3">Support</h3>
                    <div className="space-y-2">
                      {brief.supportLevels.length > 0 ? brief.supportLevels.map((lvl, i) => (
                        <div key={i} className="flex justify-between font-mono text-sm">
                          <span className="text-foreground/50">S{i + 1}</span>
                          <span className="text-emerald-400/80">{formatPrice(lvl)}</span>
                        </div>
                      )) : (
                        <p className="text-foreground/40 text-sm">N/A</p>
                      )}
                    </div>
                  </div>
                  <div className="card-enterprise">
                    <h3 className="text-sm font-medium text-red-400 mb-3">Resistance</h3>
                    <div className="space-y-2">
                      {brief.resistanceLevels.length > 0 ? brief.resistanceLevels.map((lvl, i) => (
                        <div key={i} className="flex justify-between font-mono text-sm">
                          <span className="text-foreground/50">R{i + 1}</span>
                          <span className="text-red-400/80">{formatPrice(lvl)}</span>
                        </div>
                      )) : (
                        <p className="text-foreground/40 text-sm">N/A</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Full Analysis — subscribers only */}
            {access === 'full' && brief.narrative ? (
              <>
                {/* SND Zones */}
                {brief.sndZones && brief.sndZones.length > 0 && (
                  <section className="section-padding border-b border-white/8">
                    <div className="container-default px-6 max-w-4xl mx-auto">
                      <h2 className="text-xl font-semibold mb-6 text-amber-400/90">
                        {isEn ? 'Supply & Demand Zones' : 'Zona Supply & Demand'}
                      </h2>
                      <div className="space-y-3">
                        {brief.sndZones.map((z, i) => (
                          <div key={i} className="card-enterprise flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-medium px-2 py-1 rounded ${z.type === 'DEMAND' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                {z.type}
                              </span>
                              <span className="font-mono text-sm">
                                {formatPrice(z.low)} — {formatPrice(z.high)}
                              </span>
                            </div>
                            <span className="text-xs text-foreground/40">{z.tf}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* Trade Ideas */}
                {brief.tradeIdeas && brief.tradeIdeas.length > 0 && (
                  <section className="section-padding border-b border-white/8">
                    <div className="container-default px-6 max-w-4xl mx-auto">
                      <h2 className="text-xl font-semibold mb-6 text-amber-400/90">
                        {isEn ? 'Trade Ideas' : 'Ide Trading'}
                      </h2>
                      <div className="space-y-4">
                        {brief.tradeIdeas.map((idea, i) => (
                          <div key={i} className="card-enterprise">
                            <div className="flex items-center gap-3 mb-3">
                              <span className={`text-xs font-bold px-2 py-1 rounded ${idea.direction === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                {idea.direction}
                              </span>
                              <span className="font-mono text-sm">@ {formatPrice(idea.entry)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-foreground/50">Stop Loss: </span>
                                <span className="font-mono text-red-400/80">{formatPrice(idea.sl)}</span>
                              </div>
                              <div>
                                <span className="text-foreground/50">Take Profit: </span>
                                <span className="font-mono text-emerald-400/80">{formatPrice(idea.tp)}</span>
                              </div>
                            </div>
                            <p className="text-sm text-foreground/60 mt-2">{idea.rationale}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* Narrative */}
                <section className="section-padding border-b border-white/8">
                  <div className="container-default px-6 max-w-4xl mx-auto">
                    <h2 className="text-xl font-semibold mb-6 text-amber-400/90">
                      {isEn ? 'Analysis' : 'Analisis'}
                    </h2>
                    <div
                      className="prose-custom"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(
                          (isEn && brief.narrative_en) ? brief.narrative_en : brief.narrative
                        ),
                      }}
                    />
                  </div>
                </section>
              </>
            ) : access === 'preview' ? (
              /* Subscribe CTA for non-subscribers */
              <section className="section-padding border-b border-white/8">
                <div className="container-default px-6 max-w-4xl mx-auto text-center py-12">
                  <div className="max-w-lg mx-auto">
                    <h2 className="text-xl font-semibold mb-4">
                      {isEn ? 'Full Analysis Available for Subscribers' : 'Analisis Lengkap Tersedia untuk Subscriber'}
                    </h2>
                    <p className="text-foreground/60 mb-6">
                      {isEn
                        ? 'Get SND zones, trade ideas, key patterns, and full AI-powered analysis with a subscription.'
                        : 'Dapatkan zona SND, ide trading, pola kunci, dan analisis lengkap berbasis AI dengan berlangganan.'}
                    </p>
                    <Link href="/register/signal" className="btn-primary py-3 px-8">
                      {isEn ? 'Subscribe Now' : 'Berlangganan Sekarang'}
                    </Link>
                  </div>
                </div>
              </section>
            ) : null}

            {/* Disclaimer */}
            <section className="section-padding">
              <div className="container-default px-6 max-w-4xl mx-auto">
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-xs text-foreground/40 leading-relaxed">
                    {isEn
                      ? 'Disclaimer: This brief is generated from algorithmic analysis and is not financial advice. Trading carries significant risk of loss. Past performance does not guarantee future results. Always do your own research and risk management.'
                      : 'Disclaimer: Laporan ini dihasilkan dari analisis algoritmik dan bukan merupakan saran keuangan. Trading memiliki risiko kerugian yang signifikan. Performa masa lalu tidak menjamin hasil di masa depan. Selalu lakukan riset dan manajemen risiko Anda sendiri.'}
                  </p>
                </div>
              </div>
            </section>

            {/* Back link */}
            <section className="pb-16">
              <div className="container-default px-6 max-w-4xl mx-auto">
                <Link
                  href={`/${locale}/research/briefs`}
                  className="inline-flex items-center gap-2 text-sm text-foreground/40 hover:text-amber-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  {isEn ? 'Back to Briefs' : 'Kembali ke Laporan'}
                </Link>
              </div>
            </section>
          </>
        )}
      </main>
      <EnterpriseFooter />
    </div>
  );
}
