'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { TrustStrip } from '@/components/shared/trust-strip';
import { StickyCtaBar } from '@/components/shared/sticky-cta-bar';
import { Pagination } from '@/components/ui/pagination';
import { ArticleCardImage } from '@/components/research/article-card-image';

const PER_PAGE = 9;

interface Article {
  slug: string;
  title: string;
  title_en?: string | null;
  excerpt: string;
  excerpt_en?: string | null;
  category?: string;
  author: string;
  readTime: number;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  publishedAt?: string;
}

function formatDate(dateStr: string | undefined, locale: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (locale === 'id') {
      // id: dd MMM yyyy (e.g., "26 Apr 2026")
      return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: '2-digit' });
    }
    // en: MMM dd, yyyy (e.g., "Apr 26, 2026")
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return dateStr;
  }
}

function shortAuthor(raw: string | undefined, fallbackResearchLabel: string): string {
  if (!raw) return fallbackResearchLabel;
  // "BabahAlgo Research Desk" → fallbackResearchLabel
  if (/research/i.test(raw)) return fallbackResearchLabel;
  return raw;
}

/** Humanise ArticleCategory enum (MARKET_ANALYSIS → MARKET ANALYSIS).
 *  Categories are stored as Prisma enum strings (SCREAMING_SNAKE) but
 *  must render as plain typographic labels in UI eyebrow. */
function humanizeCategory(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw.replace(/_/g, ' ');
}

export default function ResearchPage() {
  const locale = useLocale();
  const isEn = locale === 'en';
  const t = useTranslations('research_page');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function loadArticles() {
      try {
        const res = await fetch('/api/public/articles');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setArticles(data);
        }
      } catch {
        // keep empty
      } finally {
        setLoading(false);
      }
    }
    loadArticles();
  }, []);

  const visibleArticles = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return articles.slice(start, start + PER_PAGE);
  }, [articles, page]);

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
          <div className="layout-container">
            <div className="hero-section-header">
              <p className="t-eyebrow eyebrow-rule mb-4">{t('hero_eyebrow')}</p>
              <h1 className="t-display-page mb-6">
                {t('hero_title')}
              </h1>
              <p className="t-lead text-foreground/60">
                {t('hero_lead')}
              </p>
              <div className="mt-10">
                <TrustStrip />
              </div>
            </div>
          </div>
        </section>

        {/* Pair Intelligence Briefs CTA */}
        <section className="section-padding border-b border-white/8">
          <div className="layout-container">
            <Link
              href={`/${locale}/research/briefs`}
              className="block card-enterprise group hover:border-amber-500/20 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="t-eyebrow eyebrow-rule mb-2">{t('briefs_eyebrow')}</p>
                  <h2 className="text-xl font-semibold mb-2 group-hover:text-amber-400 transition-colors">
                    {t('briefs_title')}
                  </h2>
                  <p className="t-body-sm text-foreground/60">
                    {t('briefs_desc')}
                  </p>
                </div>
                <ChevronRight className="w-6 h-6 text-foreground/30 group-hover:text-amber-400 transition-colors shrink-0 ml-4" />
              </div>
            </Link>
          </div>
        </section>

        {/* Articles Grid */}
        <section className="section-padding border-b border-white/8">
          <div className="layout-container">
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card-enterprise animate-pulse overflow-hidden p-0">
                    <div className="aspect-[16/9] bg-white/5" />
                    <div className="p-5 sm:p-6">
                      <div className="h-5 w-3/4 bg-white/10 rounded mb-3" />
                      <div className="h-4 w-full bg-white/10 rounded mb-2" />
                      <div className="h-4 w-2/3 bg-white/10 rounded mb-6" />
                      <div className="h-3 w-1/2 bg-white/10 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-foreground/40 text-lg">
                  {t('empty_state')}
                </p>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visibleArticles.map((article) => {
                    const title = (isEn && article.title_en) ? article.title_en : article.title;
                    const excerpt = (isEn && article.excerpt_en) ? article.excerpt_en : article.excerpt;

                    return (
                      <Link
                        key={article.slug}
                        href={`/${locale}/research/${article.slug}`}
                        className="card-enterprise flex flex-col group cursor-pointer hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300 overflow-hidden p-0 hover:-translate-y-0.5"
                      >
                        <ArticleCardImage
                          imageUrl={article.thumbnailUrl ?? null}
                          alt={title || t('image_alt_fallback')}
                          category={humanizeCategory(article.category)}
                          aspectClass="aspect-[16/9]"
                        />
                        <div className="p-5 sm:p-6 flex flex-col flex-1">
                          {!article.thumbnailUrl && (
                            <p className="t-eyebrow eyebrow-rule mb-3">{humanizeCategory(article.category)}</p>
                          )}
                          <h2 className="text-lg font-semibold mb-3 line-clamp-2 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors leading-snug">
                            {title}
                          </h2>
                          <p className="t-body-sm text-foreground/60 leading-relaxed line-clamp-3 mb-6 flex-1">
                            {excerpt}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-4 border-t border-border/40 whitespace-nowrap overflow-hidden">
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-mono uppercase tracking-wider text-[10px]">
                              {shortAuthor(article.author, t('author_research_label'))}
                            </span>
                            <span className="text-foreground/30">·</span>
                            <span>{formatDate(article.publishedAt, locale)}</span>
                            <span className="text-foreground/30">·</span>
                            <span>{article.readTime} {t('min_read')}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <Pagination
                  page={page}
                  total={articles.length}
                  perPage={PER_PAGE}
                  onPageChange={handlePageChange}
                  labels={{
                    prev: t('pagination_prev'),
                    next: t('pagination_next'),
                    page: t('pagination_page'),
                    of: t('pagination_of'),
                  }}
                />
              </>
            )}
          </div>
        </section>

        {/* Newsletter section dihapus 2026-05-15 — redundant dengan
            EnterpriseFooter subscribe band (full-width banner di setiap halaman).
            Mendekati standar institusional: 1 newsletter prompt per halaman,
            tidak repetitive. */}

        <ResearchStickyCta />
      </main>
      <EnterpriseFooter />
    </div>
  );
}

function ResearchStickyCta() {
  const ts = useTranslations('shared');
  return (
    <StickyCtaBar
      message={ts('sticky_demo_text')}
      ctaLabel={ts('sticky_demo_cta')}
      href="/register?service=free"
    />
  );
}
