/**
 * SEO meta generator — derives metaTitle + metaDescription from article
 * body using OpenRouter. Targets:
 *   - metaTitle: 50-60 chars, keyword-front-loaded, no clickbait.
 *   - metaDescription: 150-160 chars, summarises value + CTA-implicit.
 *
 * Returns null on any failure — caller falls back to title/excerpt.
 */

import { generateText } from 'ai';
import { getOpenRouter, DEFAULT_MODEL } from './openrouter';
import { createLogger } from '@/lib/logger';

const log = createLogger('seo-meta');

const META_PROMPT_ID = `Berikan metadata SEO untuk artikel berikut. Output WAJIB format JSON dengan 2 key:
  "metaTitle": maksimal 60 karakter, keyword di awal, profesional, tanpa clickbait
  "metaDescription": 150-160 karakter, ringkas value artikel, mention "BabahAlgo" sekali kalau natural

Bahasa Indonesia.

ARTIKEL:
Judul: {{TITLE}}
Kategori: {{CATEGORY}}
Excerpt: {{EXCERPT}}
Keywords: {{KEYWORDS}}

Return JSON only, tanpa preamble atau code fence.`;

const META_PROMPT_EN = `Generate SEO metadata for the following article. Output MUST be JSON with 2 keys:
  "metaTitle": max 60 characters, keyword-first, professional, no clickbait
  "metaDescription": 150-160 characters, summarises value, mention "BabahAlgo" once if natural

English.

ARTICLE:
Title: {{TITLE}}
Category: {{CATEGORY}}
Excerpt: {{EXCERPT}}
Keywords: {{KEYWORDS}}

Return JSON only, no preamble or code fence.`;

export interface SeoMeta {
  metaTitle: string;
  metaDescription: string;
}

export interface GenerateSeoMetaInput {
  title: string;
  excerpt: string;
  category: string;
  keywords: string[];
  language: 'id' | 'en';
}

export async function generateSeoMeta(input: GenerateSeoMetaInput): Promise<SeoMeta | null> {
  const or = getOpenRouter();
  if (!or) {
    log.warn('OPENROUTER_API_KEY not set, skipping SEO meta generation');
    return null;
  }

  const template = input.language === 'id' ? META_PROMPT_ID : META_PROMPT_EN;
  const prompt = template
    .replace('{{TITLE}}', input.title)
    .replace('{{CATEGORY}}', input.category)
    .replace('{{EXCERPT}}', input.excerpt.slice(0, 500))
    .replace('{{KEYWORDS}}', input.keywords.slice(0, 6).join(', '));

  try {
    const { text } = await generateText({
      model: or(DEFAULT_MODEL),
      prompt,
      temperature: 0.3,
      maxOutputTokens: 300,
    });

    // Parse JSON — strip code fence if AI emitted one despite instructions
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/, '')
      .replace(/\s*```\s*$/, '')
      .trim();

    const parsed = JSON.parse(cleaned) as Partial<SeoMeta>;
    if (!parsed.metaTitle || !parsed.metaDescription) {
      log.warn(`SEO meta missing keys for "${input.title.slice(0, 40)}"`);
      return null;
    }

    return {
      metaTitle: parsed.metaTitle.slice(0, 70),
      metaDescription: parsed.metaDescription.slice(0, 200),
    };
  } catch (err) {
    log.warn(`SEO meta gen failed for "${input.title.slice(0, 40)}": ${err instanceof Error ? err.message : 'unknown'}`);
    return null;
  }
}
