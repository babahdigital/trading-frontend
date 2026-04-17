/**
 * CMS data fetching utilities.
 * All functions return null/[] on failure — pages use hardcoded fallback.
 */

const API_BASE = process.env.NEXT_PUBLIC_SITE_URL || '';

interface PageContent {
  id: string;
  slug: string;
  title: string;
  title_en?: string;
  subtitle?: string;
  subtitle_en?: string;
  body: string;
  body_en?: string;
  sections: Record<string, unknown>[];
  sections_en?: Record<string, unknown>[];
}

interface ArticleItem {
  id: string;
  slug: string;
  title: string;
  title_en?: string;
  excerpt: string;
  excerpt_en?: string;
  category: string;
  author: string;
  readTime: number;
  imageUrl?: string;
  publishedAt?: string;
}

interface FaqItem {
  id: string;
  question: string;
  question_en?: string;
  answer: string;
  answer_en?: string;
  category: string;
}

export async function fetchPage(slug: string): Promise<PageContent | null> {
  try {
    const res = await fetch(`${API_BASE}/api/public/pages?slug=${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchArticles(): Promise<ArticleItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/public/articles`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchFaq(category?: string): Promise<FaqItem[]> {
  try {
    const url = category
      ? `${API_BASE}/api/public/faq?category=${category}`
      : `${API_BASE}/api/public/faq`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchPricing() {
  try {
    const res = await fetch(`${API_BASE}/api/public/pricing`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchTestimonials() {
  try {
    const res = await fetch(`${API_BASE}/api/public/testimonials`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
