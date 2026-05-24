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

interface ExtractResult {
  data: Partial<SeoMeta> | null;
  error: string | null;
}

function extractSeoJson(raw: string): ExtractResult {
  let text = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === 'object') return { data: obj as Partial<SeoMeta>, error: null };
  } catch (e1) {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      let candidate = text.slice(firstBrace, lastBrace + 1);
      candidate = candidate.replace(/,\s*}/g, '}');
      // Fix smart/curly quotes that some AI models emit
      candidate = candidate.replace(/[“”„‟″‶]/g, '"');
      candidate = candidate.replace(/[‘’‚‛′‵]/g, "'");

      try {
        const obj = JSON.parse(candidate);
        if (obj && typeof obj === 'object') return { data: obj as Partial<SeoMeta>, error: null };
      } catch (e2) {
        const titleMatch = raw.match(/"metaTitle"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        const descMatch = raw.match(/"metaDescription"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (titleMatch && descMatch) {
          return {
            data: {
              metaTitle: titleMatch[1].replace(/\\"/g, '"').replace(/\\n/g, ' '),
              metaDescription: descMatch[1].replace(/\\"/g, '"').replace(/\\n/g, ' '),
            },
            error: null,
          };
        }
        const msg = e2 instanceof Error ? e2.message : 'unknown';
        return { data: null, error: 'JSON parse failed after brace extraction: ' + msg };
      }
    }

    const titleMatch = raw.match(/"metaTitle"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const descMatch = raw.match(/"metaDescription"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (titleMatch && descMatch) {
      return {
        data: {
          metaTitle: titleMatch[1].replace(/\\"/g, '"').replace(/\\n/g, ' '),
          metaDescription: descMatch[1].replace(/\\"/g, '"').replace(/\\n/g, ' '),
        },
        error: null,
      };
    }
    const msg1 = e1 instanceof Error ? e1.message : 'unknown';
    return { data: null, error: 'Direct JSON parse failed: ' + msg1 + ' | No brace-wrapped JSON found' };
  }

  return { data: null, error: 'No JSON object detected in response' };
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

    const extracted = extractSeoJson(text);
    if (extracted.error) {
      const title = input.title.slice(0, 40);
      log.warn('SEO meta JSON extraction failed for "' + title + '" - ' + extracted.error + ' - raw: ' + text.slice(0, 200));
    }
    const parsed = extracted.data;
    const success = !!(parsed?.metaTitle && parsed?.metaDescription);
    let logError: string | undefined;
    if (!success) {
      const missing = [
        !parsed?.metaTitle ? 'metaTitle' : '',
        !parsed?.metaDescription ? 'metaDescription' : '',
      ].filter(Boolean).join(', ');
      logError = extracted.error || ('Missing keys: ' + missing);
    }
    await prisma.aiCallLog
      .create({
        data: {
          purpose: 'seo_meta',
          model: MODEL_LABEL,
          inputTokens: usage?.inputTokens ?? 0,
          outputTokens: usage?.outputTokens ?? 0,
          latencyMs: Date.now() - start,
          success,
          errorMessage: logError,
          metadata: { language: input.language, category: input.category } as Prisma.InputJsonValue,
        },
      })
      .catch((e) => log.warn('AiCallLog write failed: ' + (e instanceof Error ? e.message : 'unknown')));

    if (!success) {
      log.warn('SEO meta missing keys for "' + input.title.slice(0, 40) + '"');
      return null;
    }

    const rawTitle = parsed!.metaTitle!;
    const rawDesc = parsed!.metaDescription!;
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
    log.warn('SEO meta gen failed for "' + input.title.slice(0, 40) + '": ' + (err instanceof Error ? err.message : 'unknown'));
    return null;
  }
}
