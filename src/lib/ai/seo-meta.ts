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
import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';

const log = createLogger('seo-meta');

const MODEL_LABEL = `openrouter/${DEFAULT_MODEL.split('/').pop()}`;

const META_PROMPT_ID = `Berikan metadata SEO untuk artikel berikut. Output WAJIB format JSON dengan 2 key:
  "metaTitle": maksimal 60 karakter, keyword utama di awal, engaging & profesional, tanpa clickbait. Gunakan format seperti "Panduan: ...", "Strategi: ...", atau "[Keyword]: Cara/Analisis ..." untuk CTR tinggi
  "metaDescription": 150-160 karakter, ringkas value + insight unik artikel, mention "BabahAlgo" sekali kalau natural, akhiri dengan implicit CTA

Bahasa Indonesia.

ARTIKEL:
Judul: {{TITLE}}
Kategori: {{CATEGORY}}
Excerpt: {{EXCERPT}}
Keywords: {{KEYWORDS}}

Return JSON only, tanpa preamble atau code fence.`;

const META_PROMPT_EN = `Generate SEO metadata for the following article. Output MUST be JSON with 2 keys:
  "metaTitle": max 60 characters, primary keyword first, engaging & professional, no clickbait. Use patterns like "Guide: ...", "How to ...", or "[Keyword]: Analysis & Strategy" for high CTR
  "metaDescription": 150-160 characters, summarise unique value + key insight, mention "BabahAlgo" once if natural, end with implicit CTA

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

/**
 * Robust JSON extractor for AI-generated SEO metadata.
 *
 * Handles common AI response issues:
 *   - Markdown code fences (```json ... ```)
 *   - Explanatory preamble/postamble text around JSON
 *   - Trailing commas before closing brace
 *   - Smart/curly quotes in values
 *
 * Returns null if extraction fails — caller falls back gracefully.
 */
function extractSeoJson(raw: string): Partial<SeoMeta> | null {
  // Step 1: Strip markdown code fences (```json ... ``` or ``` ... ```)
  let text = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  // Step 2: Try direct parse first (best case)
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === 'object') return obj as Partial<SeoMeta>;
  } catch {
    // fallthrough
  }

  // Step 3: Extract JSON object from anywhere in the response text.
  // Find the first `{` and last `}` to isolate the JSON object.
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    let candidate = text.slice(firstBrace, lastBrace + 1);

    // Fix trailing commas before closing brace: `,"metaDescription": "..."}` is ok,
    // but `"...",}` is not — strip trailing comma.
    candidate = candidate.replace(/,\s*}/g, '}');

    // Fix smart/curly quotes that some AI models emit
    candidate = candidate.replace(/[“”„‟″‶]/g, '"');
    candidate = candidate.replace(/[‘’‚‛′‵]/g, "'");

    try {
      const obj = JSON.parse(candidate);
      if (obj && typeof obj === 'object') return obj as Partial<SeoMeta>;
    } catch {
      // fallthrough
    }
  }

  // Step 4: Regex fallback — extract metaTitle and metaDescription individually.
  // This handles cases where JSON is deeply malformed but the key-value pairs
  // are identifiable.
  const titleMatch = raw.match(/"metaTitle"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const descMatch = raw.match(/"metaDescription"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (titleMatch && descMatch) {
    return {
      metaTitle: titleMatch[1].replace(/\\"/g, '"').replace(/\\n/g, ' '),
      metaDescription: descMatch[1].replace(/\\"/g, '"').replace(/\\n/g, ' '),
    };
  }

  return null;
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

  const start = Date.now();
  try {
    const { text, usage } = await generateText({
      model: or.chat(DEFAULT_MODEL),
      prompt,
      temperature: 0.3,
      maxOutputTokens: 1024,
    });

    // Parse JSON — robust extraction handling multiple AI output formats:
    //   1. Clean JSON (ideal)
    //   2. JSON wrapped in markdown code fences (```json ... ```)
    //   3. JSON embedded in explanatory text
    //   4. Malformed JSON with trailing commas or unescaped chars
    const parsed = extractSeoJson(text);
    if (!parsed) {
      log.warn(`SEO meta JSON extraction failed for "${input.title.slice(0, 40)}" — raw response: ${text.slice(0, 300)}`);
    }
    const success = !!(parsed?.metaTitle && parsed?.metaDescription);
    await prisma.aiCallLog
      .create({
        data: {
          purpose: 'seo_meta',
          model: MODEL_LABEL,
          inputTokens: usage?.inputTokens ?? 0,
          outputTokens: usage?.outputTokens ?? 0,
          latencyMs: Date.now() - start,
          success,
          metadata: { language: input.language, category: input.category } as Prisma.InputJsonValue,
        },
      })
      .catch((err) => log.warn(`AiCallLog write failed: ${err instanceof Error ? err.message : 'unknown'}`));

    if (!success) {
      log.warn(`SEO meta missing keys for "${input.title.slice(0, 40)}"`);
      return null;
    }

    // Enforce strict SEO length limits: metaTitle <= 60 chars, metaDescription <= 160 chars.
    // Truncate at word boundary to avoid mid-word cuts in SERPs.
    const rawTitle = parsed.metaTitle!;
    const rawDesc = parsed.metaDescription!;
    return {
      metaTitle: rawTitle.length <= 60 ? rawTitle : rawTitle.slice(0, 60).replace(/\s+\S*$/, '').trim(),
      metaDescription: rawDesc.length <= 160 ? rawDesc : rawDesc.slice(0, 160).replace(/\s+\S*$/, '').trim(),
    };
  } catch (err) {
    await prisma.aiCallLog
      .create({
        data: {
          purpose: 'seo_meta',
          model: MODEL_LABEL,
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: Date.now() - start,
          success: false,
          errorMessage: err instanceof Error ? err.message : 'unknown',
          metadata: { language: input.language } as Prisma.InputJsonValue,
        },
      })
      .catch(() => {});
    log.warn(`SEO meta gen failed for "${input.title.slice(0, 40)}": ${err instanceof Error ? err.message : 'unknown'}`);
    return null;
  }
}
