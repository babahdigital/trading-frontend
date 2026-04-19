'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';

interface ArticleDetail {
  id: string;
  slug: string;
  title: string;
  title_en?: string | null;
  excerpt: string;
  excerpt_en?: string | null;
  body: string;
  body_en?: string | null;
  category: string;
  author: string;
  readTime: number;
  imageUrl?: string | null;
  publishedAt?: string;
}

function formatDate(dateStr: string | undefined, locale: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** Simple Markdown to HTML — handles headings, bold, italic, lists, tables, paragraphs. */
function renderMarkdown(md: string): string {
  return md
    // Tables
    .replace(/^(\|.+\|)\n(\|[-:| ]+\|)\n((?:\|.+\|\n?)*)/gm, (_match, header: string, _sep: string, body: string) => {
      const ths = header.split('|').filter(Boolean).map((c: string) => `<th class="px-3 py-2 text-left text-xs font-medium text-foreground/60 border-b border-white/10">${c.trim()}</th>`).join('');
      const rows = body.trim().split('\n').map((row: string) => {
        const tds = row.split('|').filter(Boolean).map((c: string) => `<td class="px-3 py-2 text-sm border-b border-white/[0.04]">${c.trim()}</td>`).join('');
        return `<tr>${tds}</tr>`;
      }).join('');
      return `<div class="overflow-x-auto my-6"><table class="w-full"><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table></div>`;
    })
    // Headings
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-10 mb-4 text-amber-400/90">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-6">$1</h1>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground/90">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Ordered lists
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-6 list-decimal text-foreground/70 leading-relaxed">$2</li>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="ml-6 list-disc text-foreground/70 leading-relaxed">$1</li>')
    // Wrap consecutive <li> items
    .replace(/((?:<li class="ml-6 list-disc[^>]*>.*<\/li>\n?)+)/g, '<ul class="my-4 space-y-1">$1</ul>')
    .replace(/((?:<li class="ml-6 list-decimal[^>]*>.*<\/li>\n?)+)/g, '<ol class="my-4 space-y-1">$1</ol>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="border-white/10 my-8" />')
    // Paragraphs (non-empty lines not already wrapped in HTML)
    .replace(/^(?!<[a-z])((?!^\s*$).+)$/gm, '<p class="text-foreground/70 leading-relaxed my-3">$1</p>')
    // Clean up empty paragraphs
    .replace(/<p[^>]*>\s*<\/p>/g, '');
}

export default function ArticleDetailPage() {
  const locale = useLocale();
  const isEn = locale === 'en';
  const params = useParams();
  const slug = params.slug as string;

  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/public/articles?slug=${encodeURIComponent(slug)}`);
        if (!res.ok) { setError(true); return; }
        const data = await res.json();
        if (data.error) { setError(true); return; }
        setArticle(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    if (slug) load();
  }, [slug]);

  const title = article ? ((isEn && article.title_en) ? article.title_en : article.title) : '';
  const body = article ? ((isEn && article.body_en) ? article.body_en : article.body) : '';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        {loading ? (
          <section className="section-padding">
            <div className="container-default px-6 max-w-3xl mx-auto">
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
        ) : error || !article ? (
          <section className="section-padding">
            <div className="container-default px-6 max-w-3xl mx-auto text-center py-16">
              <h1 className="text-2xl font-bold mb-4">
                {isEn ? 'Article not found' : 'Artikel tidak ditemukan'}
              </h1>
              <p className="text-foreground/60 mb-8">
                {isEn ? 'The article you are looking for does not exist.' : 'Artikel yang Anda cari tidak ada.'}
              </p>
              <Link href={`/${locale}/research`} className="btn-primary py-3 px-6">
                {isEn ? 'Back to Research' : 'Kembali ke Riset'}
              </Link>
            </div>
          </section>
        ) : (
          <>
            {/* Article Header */}
            <section className="section-padding border-b border-white/8">
              <div className="container-default px-6 max-w-3xl mx-auto">
                <Link
                  href={`/${locale}/research`}
                  className="inline-flex items-center gap-2 text-sm text-foreground/40 hover:text-amber-400 transition-colors mb-6"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  {isEn ? 'Back to Research' : 'Kembali ke Riset'}
                </Link>

                <p className="t-eyebrow mb-4">{article.category}</p>
                <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-6">
                  {title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-foreground/50">
                  <span>{article.author}</span>
                  <span className="w-1 h-1 rounded-full bg-foreground/20" />
                  <span>{formatDate(article.publishedAt, locale)}</span>
                  <span className="w-1 h-1 rounded-full bg-foreground/20" />
                  <span>{article.readTime} min {isEn ? 'read' : 'baca'}</span>
                </div>
              </div>
            </section>

            {/* Article Body */}
            <section className="section-padding">
              <div className="container-default px-6 max-w-3xl mx-auto">
                <div
                  className="prose-custom"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
                />
              </div>
            </section>

            {/* Back link */}
            <section className="pb-16">
              <div className="container-default px-6 max-w-3xl mx-auto">
                <Link
                  href={`/${locale}/research`}
                  className="inline-flex items-center gap-2 text-sm text-foreground/40 hover:text-amber-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  {isEn ? 'Back to Research' : 'Kembali ke Riset'}
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
