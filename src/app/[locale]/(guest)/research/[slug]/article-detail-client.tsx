'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, Clock, User as UserIcon } from 'lucide-react';
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
      return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: '2-digit' });
    }
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

// HTML-escape any user-supplied text before injecting via dangerouslySetInnerHTML
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function applyInline(s: string): string {
  return s
    // image: ![alt](url)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt: string, url: string) =>
      `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" class="rounded-md border border-border my-4 max-w-full" />`)
    // link: [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text: string, url: string) =>
      `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${text}</a>`)
    // inline math $...$
    .replace(/\$([^$\n]+?)\$/g, (_m, expr: string) => `<span class="formula-inline">${expr}</span>`)
    // mark / highlight ==text==
    .replace(/==([^=]+)==/g, '<mark>$1</mark>')
    // bold + italic
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // inline code `code`
    .replace(/`([^`]+)`/g, (_m, code: string) => `<code>${escapeHtml(code)}</code>`);
}

/**
 * Render a constrained subset of Markdown to HTML with institutional styling
 * via the .prose-research scope (defined in globals.css).
 *
 * Supported: H1-H3, paragraphs, blockquotes, ordered/unordered lists, tables,
 * fenced code blocks (```), block formulas ($$...$$), inline math ($...$),
 * highlight (==...==), bold/italic, links, images, horizontal rule (---).
 */
function renderMarkdown(md: string): string {
  if (!md) return '';
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];

  let inFence = false;
  let fenceLang = '';
  let fenceBuffer: string[] = [];

  let inFormula = false;
  let formulaBuffer: string[] = [];

  let listType: 'ul' | 'ol' | null = null;
  let listBuffer: string[] = [];

  let tableHeader: string[] | null = null;
  let tableRows: string[][] = [];

  const flushList = () => {
    if (!listType) return;
    out.push(`<${listType}>${listBuffer.join('')}</${listType}>`);
    listType = null;
    listBuffer = [];
  };
  const flushTable = () => {
    if (!tableHeader) return;
    const ths = tableHeader.map((c) => `<th>${applyInline(escapeHtml(c.trim()))}</th>`).join('');
    const rows = tableRows.map((r) => `<tr>${r.map((c) => `<td>${applyInline(escapeHtml(c.trim()))}</td>`).join('')}</tr>`).join('');
    out.push(`<div class="overflow-x-auto my-6"><table>${`<thead><tr>${ths}</tr></thead>`}<tbody>${rows}</tbody></table></div>`);
    tableHeader = null;
    tableRows = [];
  };

  const closeBlocks = () => {
    flushList();
    flushTable();
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw;

    // ─── code fence ───
    if (inFence) {
      if (/^```\s*$/.test(line)) {
        const codeHtml = escapeHtml(fenceBuffer.join('\n'));
        const langAttr = fenceLang ? ` data-lang="${escapeHtml(fenceLang)}"` : '';
        out.push(`<pre${langAttr}><code>${codeHtml}</code></pre>`);
        inFence = false;
        fenceLang = '';
        fenceBuffer = [];
      } else {
        fenceBuffer.push(line);
      }
      continue;
    }
    const fenceMatch = /^```(\w+)?\s*$/.exec(line);
    if (fenceMatch) {
      closeBlocks();
      inFence = true;
      fenceLang = fenceMatch[1] || '';
      fenceBuffer = [];
      continue;
    }

    // ─── block formula $$...$$ ───
    if (inFormula) {
      if (/^\$\$\s*$/.test(line)) {
        out.push(`<div class="formula">${escapeHtml(formulaBuffer.join('\n'))}</div>`);
        inFormula = false;
        formulaBuffer = [];
      } else {
        formulaBuffer.push(line);
      }
      continue;
    }
    if (/^\$\$\s*$/.test(line)) {
      closeBlocks();
      inFormula = true;
      formulaBuffer = [];
      continue;
    }
    // single-line $$expr$$
    const inlineFormulaBlock = /^\$\$\s*(.+?)\s*\$\$\s*$/.exec(line);
    if (inlineFormulaBlock) {
      closeBlocks();
      out.push(`<div class="formula">${escapeHtml(inlineFormulaBlock[1])}</div>`);
      continue;
    }

    // ─── table ───
    if (/^\|.+\|\s*$/.test(line)) {
      const cells = line.replace(/^\||\|$/g, '').split('|');
      const next = lines[i + 1] ?? '';
      if (!tableHeader && /^\|[-:|\s]+\|\s*$/.test(next)) {
        flushList();
        tableHeader = cells;
        i += 1; // skip separator
        tableRows = [];
        continue;
      }
      if (tableHeader) {
        tableRows.push(cells);
        continue;
      }
    } else if (tableHeader) {
      flushTable();
    }

    // ─── horizontal rule ───
    if (/^\s*-{3,}\s*$/.test(line)) {
      closeBlocks();
      out.push('<hr />');
      continue;
    }

    // ─── headings ───
    const h1 = /^#\s+(.+)$/.exec(line);
    const h2 = /^##\s+(.+)$/.exec(line);
    const h3 = /^###\s+(.+)$/.exec(line);
    if (h1) {
      closeBlocks();
      out.push(`<h1>${applyInline(escapeHtml(h1[1]))}</h1>`);
      continue;
    }
    if (h2) {
      closeBlocks();
      out.push(`<h2>${applyInline(escapeHtml(h2[1]))}</h2>`);
      continue;
    }
    if (h3) {
      closeBlocks();
      out.push(`<h3>${applyInline(escapeHtml(h3[1]))}</h3>`);
      continue;
    }

    // ─── blockquote ───
    const bq = /^>\s?(.*)$/.exec(line);
    if (bq) {
      closeBlocks();
      out.push(`<blockquote>${applyInline(escapeHtml(bq[1]))}</blockquote>`);
      continue;
    }

    // ─── lists ───
    const ol = /^\s*(\d+)\.\s+(.+)$/.exec(line);
    const ul = /^\s*[-*]\s+(.+)$/.exec(line);
    if (ol) {
      flushTable();
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      listBuffer.push(`<li>${applyInline(escapeHtml(ol[2]))}</li>`);
      continue;
    }
    if (ul) {
      flushTable();
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      listBuffer.push(`<li>${applyInline(escapeHtml(ul[1]))}</li>`);
      continue;
    } else if (listType) {
      flushList();
    }

    // ─── paragraph / blank ───
    if (/^\s*$/.test(line)) {
      // blank line is a separator; do nothing
      continue;
    }
    out.push(`<p>${applyInline(escapeHtml(line))}</p>`);
  }

  closeBlocks();
  if (inFence) {
    out.push(`<pre><code>${escapeHtml(fenceBuffer.join('\n'))}</code></pre>`);
  }
  if (inFormula) {
    out.push(`<div class="formula">${escapeHtml(formulaBuffer.join('\n'))}</div>`);
  }
  return out.join('\n');
}

export interface ArticleDetailClientProps {
  article: ArticleDetail | null;
}

export function ArticleDetailClient({ article }: ArticleDetailClientProps) {
  const locale = useLocale();
  const isEn = locale === 'en';

  const title = article ? ((isEn && article.title_en) ? article.title_en : article.title) : '';
  const body = article ? ((isEn && article.body_en) ? article.body_en : article.body) : '';
  const excerpt = article ? ((isEn && article.excerpt_en) ? article.excerpt_en : article.excerpt) : '';

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
              <p className="text-muted-foreground mb-8">
                {isEn ? 'The article you are looking for does not exist.' : 'Artikel yang Anda cari tidak ada.'}
              </p>
              <Link href={`/${locale}/research`} className="btn-primary py-3 px-6">
                {isEn ? 'Back to Research' : 'Kembali ke Riset'}
              </Link>
            </div>
          </section>
        ) : (
          <>
            {/* Hero — research-page distinct stamp (page-stamp-rule) */}
            <section className="page-stamp-rule border-b border-border">
              <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 pb-10 lg:pt-20 lg:pb-14">
                <Link
                  href={`/${locale}/research`}
                  className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-8"
                >
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
                  {isEn ? 'Back to Research' : 'Kembali ke Riset'}
                </Link>

                <div className="t-eyebrow mb-4 text-[hsl(var(--primary))]">{article.category}</div>
                <h1 className="font-display text-3xl md:text-5xl leading-tight tracking-tight text-foreground mb-6">
                  {title}
                </h1>
                {excerpt ? (
                  <p className="t-lead text-muted-foreground max-w-2xl mb-8">{excerpt}</p>
                ) : null}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground border-t border-border pt-6">
                  <span className="inline-flex items-center gap-1.5">
                    <UserIcon className="h-3.5 w-3.5" strokeWidth={2} />
                    {shortAuthor(article.author, isEn)}
                  </span>
                  <span className="h-3 w-px bg-border" aria-hidden />
                  <span className="whitespace-nowrap">{formatDate(article.publishedAt, locale)}</span>
                  <span className="h-3 w-px bg-border" aria-hidden />
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <Clock className="h-3.5 w-3.5" strokeWidth={2} />
                    {article.readTime} {isEn ? 'min read' : 'min baca'}
                  </span>
                </div>
              </div>
            </section>

            {/* Body — institutional research prose */}
            <section className="py-12 lg:py-16">
              <div className="max-w-3xl mx-auto px-4 sm:px-6">
                <article
                  className="prose-research"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
                />
              </div>
            </section>

            {/* Footer back link */}
            <section className="pb-16 border-t border-border">
              <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
                <Link
                  href={`/${locale}/research`}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
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
