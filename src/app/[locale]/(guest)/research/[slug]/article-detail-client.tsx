'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';

export interface ArticleDetail {
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
  metaTitle?: string | null;
  metaTitle_en?: string | null;
  metaDescription?: string | null;
  metaDescription_en?: string | null;
  publishedAt?: string | null;
}

function formatDate(dateStr: string | null | undefined, locale: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (locale === 'id') {
      // id: dd MMMM yyyy (contoh: "26 April 2026")
      return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: '2-digit' });
    }
    // en: MMMM dd, yyyy (e.g., "April 26, 2026")
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' });
  } catch {
    return dateStr;
  }
}

function shortAuthor(raw: string | undefined, isEn: boolean): string {
  if (!raw) return isEn ? 'Research' : 'Riset';
  if (/research/i.test(raw)) return isEn ? 'Research' : 'Riset';
  return raw;
}

/** Simple Markdown to HTML — handles headings, bold, italic, lists, tables, paragraphs. */
function renderMarkdown(md: string): string {
  return md
    // Tables — wrap in overflow-x-auto for responsive horizontal scroll on mobile
    .replace(/^(\|.+\|)\n(\|[-:| ]+\|)\n((?:\|.+\|\n?)*)/gm, (_match, header: string, _sep: string, body: string) => {
      const ths = header.split('|').filter(Boolean).map((c: string) => `<th class="px-3 py-2 text-left text-xs font-medium text-foreground/60 border-b border-white/10 whitespace-nowrap">${c.trim()}</th>`).join('');
      const rows = body.trim().split('\n').map((row: string) => {
        const tds = row.split('|').filter(Boolean).map((c: string) => `<td class="px-3 py-2 text-sm border-b border-white/[0.04] whitespace-nowrap">${c.trim()}</td>`).join('');
        return `<tr>${tds}</tr>`;
      }).join('');
      return `<div class="my-6 overflow-x-auto rounded-md border border-white/8 bg-white/[0.02]"><table class="w-full min-w-max"><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table></div>`;
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

export interface ArticleDetailClientProps {
  article: ArticleDetail | null;
}

export function ArticleDetailClient({ article }: ArticleDetailClientProps) {
  const locale = useLocale();
  const isEn = locale === 'en';

  const title = article ? ((isEn && article.title_en) ? article.title_en : article.title) : '';
  const body = article ? ((isEn && article.body_en) ? article.body_en : article.body) : '';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        {!article ? (
          <section className="section-padding">
            <div className="container-default px-4 sm:px-6 max-w-3xl mx-auto text-center py-16">
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
            <section className="section-padding border-b border-white/8">
              <div className="container-default px-4 sm:px-6 max-w-3xl mx-auto">
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
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono uppercase tracking-wider text-[11px]">
                    {shortAuthor(article.author, isEn)}
                  </span>
                  <span className="text-foreground/30">·</span>
                  <span className="whitespace-nowrap">{formatDate(article.publishedAt, locale)}</span>
                  <span className="text-foreground/30">·</span>
                  <span className="whitespace-nowrap">{article.readTime} {isEn ? 'min read' : 'min baca'}</span>
                </div>
              </div>
            </section>

            <section className="section-padding">
              <div className="container-default px-4 sm:px-6 max-w-3xl mx-auto">
                <div
                  className="prose-custom"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
                />
              </div>
            </section>

            <section className="pb-16">
              <div className="container-default px-4 sm:px-6 max-w-3xl mx-auto">
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
