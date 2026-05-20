'use client';

import Image from 'next/image';
import {
  LineChart, BookOpen, Brain, Globe, BarChart3, Calendar, Sparkles,
  Shield, GraduationCap, Layers, Newspaper, TrendingUp, Microscope,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Article cover image — selalu render box dengan aspect 16/9 supaya card height
 * konsisten antara article yang punya `imageUrl` dan yang tidak.
 *
 * - imageUrl null → fallback gradient + category icon (pattern Stripe/Linear)
 * - imageUrl ada → next/image dengan fill + sizes hint
 *
 * Decorative: icon dipilih dari kategori artikel.
 */

interface ArticleCardImageProps {
  imageUrl?: string | null;
  alt: string;
  category?: string;
  className?: string;
  /** Aspect ratio Tailwind (default 16/9). Pakai `aspect-square` untuk variant grid. */
  aspectClass?: string;
}

// Category → icon + accent color. Mapping covers the canonical Prisma
// ArticleCategory enum values (MARKET_ANALYSIS / CASE_STUDY / EDUCATION /
// RESEARCH / RISK / STRATEGY) as well as their humanised + lowercased
// variants so the renderer works regardless of which form the parent
// passes in (raw enum from DB OR `humanizeCategory()` output).
type CategoryMeta = { icon: LucideIcon; accent: string };

const DEFAULT_META: CategoryMeta = {
  icon: BookOpen,
  accent: 'text-muted-foreground',
};

const CATEGORY_META: Record<string, CategoryMeta> = {
  market_analysis: { icon: BarChart3, accent: 'text-sky-500 dark:text-sky-400' },
  market_recap: { icon: BarChart3, accent: 'text-sky-500 dark:text-sky-400' },
  case_study: { icon: LineChart, accent: 'text-amber-500 dark:text-amber-400' },
  ai_lesson: { icon: Brain, accent: 'text-violet-500 dark:text-violet-400' },
  education: { icon: GraduationCap, accent: 'text-violet-500 dark:text-violet-400' },
  research: { icon: Microscope, accent: 'text-emerald-500 dark:text-emerald-400' },
  correlation: { icon: Globe, accent: 'text-emerald-500 dark:text-emerald-400' },
  risk: { icon: Shield, accent: 'text-rose-500 dark:text-rose-400' },
  strategy: { icon: Layers, accent: 'text-cyan-500 dark:text-cyan-400' },
  preview: { icon: Calendar, accent: 'text-indigo-500 dark:text-indigo-400' },
  news: { icon: Newspaper, accent: 'text-blue-500 dark:text-blue-400' },
  trending: { icon: TrendingUp, accent: 'text-amber-500 dark:text-amber-400' },
};

function normaliseKey(category: string | undefined): string {
  if (!category) return '';
  // Accept both "MARKET_ANALYSIS" and humanised "MARKET ANALYSIS" + any
  // mixed-case variant.
  return category.toLowerCase().replace(/\s+/g, '_');
}

function pickCategoryMeta(category: string | undefined): CategoryMeta {
  const key = normaliseKey(category);
  if (!key) return DEFAULT_META;
  if (CATEGORY_META[key]) return CATEGORY_META[key];
  for (const [pattern, meta] of Object.entries(CATEGORY_META)) {
    if (key.includes(pattern)) return meta;
  }
  return DEFAULT_META;
}

function pickCategoryIcon(category: string | undefined): LucideIcon {
  return pickCategoryMeta(category).icon;
}

function pickCategoryAccent(category: string | undefined): string {
  return pickCategoryMeta(category).accent;
}

export function ArticleCardImage({
  imageUrl,
  alt,
  category,
  className = '',
  aspectClass = 'aspect-[16/9]',
}: ArticleCardImageProps) {
  // Icon di-resolve dari static lookup table (pickCategoryMeta) — bukan dynamic
  // component creation. Static-components rule false-positive di pattern map ini.
  const Icon = pickCategoryIcon(category);
  const accentClass = pickCategoryAccent(category);

  if (imageUrl) {
    return (
      <div className={`relative ${aspectClass} bg-muted/30 overflow-hidden ${className}`}>
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          quality={85}
        />
      </div>
    );
  }

  // Fallback — gradient + icon. Pattern terinspirasi Stripe/Linear article cards.
  return (
    <div
      className={`relative ${aspectClass} overflow-hidden ${className}`}
      role="img"
      aria-label={alt}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.08] via-amber-500/[0.04] to-transparent dark:from-amber-500/[0.12] dark:via-amber-500/[0.06]" />
      <div className="absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,_rgba(245,181,71,0.18)_1px,transparent_0)] [background-size:24px_24px] opacity-50" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="inline-flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-amber-500/[0.06] dark:bg-amber-500/[0.10] ring-1 ring-amber-500/30 backdrop-blur-sm">
          {/* eslint-disable-next-line react-hooks/static-components */}
          <Icon
            className={`h-7 w-7 sm:h-8 sm:w-8 ${accentClass}`}
            strokeWidth={1.5}
            aria-hidden
          />
        </div>
      </div>
      {category ? (
        <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {/* eslint-disable-next-line react-hooks/static-components */}
          <Icon className={`h-3 w-3 ${accentClass}`} strokeWidth={2} aria-hidden />
          {category}
        </span>
      ) : null}
    </div>
  );
}
