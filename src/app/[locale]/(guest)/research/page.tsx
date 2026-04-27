'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Pagination } from '@/components/ui/pagination';

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
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('hero_eyebrow')}</p>
            <h1 className="t-display-page mb-6">
              {t('hero_title')}
            </h1>
            <p className="t-lead text-foreground/60 max-w-2xl">
              {t('hero_lead')}
            </p>
          </div>
        </section>

        {/* Pair Intelligence Briefs CTA */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-4 sm:px-6">
            <Link
              href={`/${locale}/research/briefs`}
              className="block card-enterprise group hover:border-amber-500/20 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="t-eyebrow mb-2">{t('briefs_eyebrow')}</p>
                  <h2 className="text-xl font-semibold mb-2 group-hover:text-amber-400 transition-colors">
                    {t('briefs_title')}
                  </h2>
                  <p className="t-body-sm text-foreground/60">
                    {t('briefs_desc')}
                  </p>
                </div>
                <svg className="w-6 h-6 text-foreground/30 group-hover:text-amber-400 transition-colors shrink-0 ml-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>
        </section>

        {/* Articles Grid */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-4 sm:px-6">
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card-enterprise animate-pulse">
                    <div className="h-4 w-20 bg-white/10 rounded mb-3" />
                    <div className="h-5 w-3/4 bg-white/10 rounded mb-3" />
                    <div className="h-4 w-full bg-white/10 rounded mb-2" />
                    <div className="h-4 w-2/3 bg-white/10 rounded mb-6" />
                    <div className="h-3 w-1/2 bg-white/10 rounded" />
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
                        className="card-enterprise flex flex-col group cursor-pointer hover:border-amber-500/20 transition-colors overflow-hidden"
                      >
                        {article.imageUrl && (
                          <div className="relative w-[calc(100%+4rem)] aspect-[16/9] bg-muted/30 -ml-8 -mt-8 mb-6 overflow-hidden rounded-t-[var(--radius-lg)]">
                            <Image
                              src={article.imageUrl}
                              alt={title || t('image_alt_fallback')}
                              fill
                              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
                              quality={85}
                            />
                          </div>
                        )}
                        <p className="t-eyebrow mb-3">{article.category}</p>
                        <h2 className="text-lg font-medium mb-3 line-clamp-2 group-hover:text-amber-400 transition-colors">
                          {title}
                        </h2>
                        <p className="t-body-sm text-foreground/60 leading-relaxed line-clamp-3 mb-6 flex-1">
                          {excerpt}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-4 border-t border-border/40 whitespace-nowrap overflow-hidden">
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono uppercase tracking-wider text-[10px]">
                            {shortAuthor(article.author, t('author_research_label'))}
                          </span>
                          <span className="text-foreground/30">·</span>
                          <span>{formatDate(article.publishedAt, locale)}</span>
                          <span className="text-foreground/30">·</span>
                          <span>{article.readTime} {t('min_read')}</span>
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

        {/* Newsletter */}
        <section className="section-padding">
          <div className="container-default px-4 sm:px-6">
            <div className="max-w-xl mx-auto text-center">
              <p className="t-eyebrow mb-3">{t('newsletter_eyebrow')}</p>
              <h2 className="t-display-sub mb-3">
                {t('newsletter_title')}
              </h2>
              <p className="t-body-sm text-foreground/60 mb-8">
                {t('newsletter_lead')}
              </p>
              <form className="flex gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder={t('newsletter_email_placeholder')}
                  className="flex-1 border border-white/10 rounded-md px-4 py-3 bg-white/[0.03] text-foreground text-sm font-mono placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-shadow"
                  required
                />
                <button type="submit" className="btn-primary shrink-0 py-3 px-6">
                  {t('newsletter_submit')}
                </button>
              </form>
              <p className="text-xs text-foreground/40 mt-4">
                {t('newsletter_disclaimer')}
              </p>
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
