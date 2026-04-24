import type { Metadata } from 'next';
import { prisma } from '@/lib/db/prisma';
import { ArticleDetailClient, type ArticleDetail } from './article-detail-client';

export const dynamic = 'force-dynamic';

interface PageParams {
  params: Promise<{ locale: string; slug: string }>;
}

async function loadArticle(slug: string): Promise<ArticleDetail | null> {
  try {
    const article = await prisma.article.findUnique({
      where: { slug },
      select: {
        id: true, slug: true,
        title: true, title_en: true,
        excerpt: true, excerpt_en: true,
        body: true, body_en: true,
        category: true, author: true, readTime: true,
        imageUrl: true,
        metaTitle: true, metaTitle_en: true,
        metaDescription: true, metaDescription_en: true,
        publishedAt: true, isPublished: true,
      },
    });
    if (!article || !article.isPublished) return null;
    return {
      ...article,
      publishedAt: article.publishedAt ? article.publishedAt.toISOString() : null,
    } as ArticleDetail;
  } catch {
    return null;
  }
}

/**
 * Server-side metadata generation per Next.js Metadata API. Pulls
 * SEO fields directly from DB (metaTitle / metaDescription generated
 * by AI worker; falls back to display title + excerpt when null).
 *
 * Renders <title>, <meta description>, OpenGraph + Twitter Card tags
 * fully indexable by Google / social platforms — no JS execution
 * needed by the crawler.
 */
export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await loadArticle(slug);

  if (!article) {
    return {
      title: locale === 'en' ? 'Article not found — BabahAlgo' : 'Artikel tidak ditemukan — BabahAlgo',
      robots: { index: false, follow: false },
    };
  }

  const isEn = locale === 'en';
  const title = (isEn ? article.metaTitle_en || article.title_en : article.metaTitle || article.title) || article.title;
  const description = (isEn ? article.metaDescription_en || article.excerpt_en : article.metaDescription || article.excerpt) || article.excerpt;
  const canonicalPath = isEn ? `/en/research/${article.slug}` : `/research/${article.slug}`;

  // Note: data-URI imageUrl is fine for <meta property="og:image"> in
  // most major social parsers (FB, LinkedIn, Twitter). For broader
  // compatibility migrate to S3/R2 URLs later.
  const ogImage = article.imageUrl ?? undefined;

  return {
    title: `${title} — BabahAlgo`,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: {
        'id-ID': `/research/${article.slug}`,
        'en-US': `/en/research/${article.slug}`,
      },
    },
    openGraph: {
      title,
      description,
      type: 'article',
      locale: isEn ? 'en_US' : 'id_ID',
      siteName: 'BabahAlgo',
      url: canonicalPath,
      ...(ogImage ? { images: [{ url: ogImage, width: 1280, height: 720, alt: title }] } : {}),
      authors: [article.author],
      publishedTime: article.publishedAt ?? undefined,
      section: article.category,
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    other: {
      'article:author': article.author,
      'article:section': article.category,
    },
  };
}

export default async function ArticleDetailPage({ params }: PageParams) {
  const { slug } = await params;
  const article = await loadArticle(slug);

  return <ArticleDetailClient article={article} />;
}
