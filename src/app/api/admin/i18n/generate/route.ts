export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getOpenRouter, DEFAULT_MODEL } from '@/lib/ai/openrouter';

const TRANSLATE_PROMPT = `Translate the following Indonesian text to English.
Context: fintech/trading platform. Keep it professional and institutional.
Only return the translated text, no explanations or additional formatting.`;

const TRANSLATE_JSON_PROMPT = `Translate the values in this JSON from Indonesian to English.
Context: fintech/trading platform. Keep keys unchanged. Only return valid JSON.
Maintain professional, institutional tone.`;

async function translateText(text: string): Promise<string> {
  const or = getOpenRouter();
  if (!or) throw new Error('OPENROUTER_API_KEY not configured');
  const { text: result } = await generateText({
    model: or(DEFAULT_MODEL),
    prompt: `${TRANSLATE_PROMPT}\n\n${text}`,
    temperature: 0.2,
  });
  return result.trim();
}

async function translateJson(json: unknown): Promise<unknown> {
  const or = getOpenRouter();
  if (!or) throw new Error('OPENROUTER_API_KEY not configured');
  const { text: result } = await generateText({
    model: or(DEFAULT_MODEL),
    prompt: `${TRANSLATE_JSON_PROMPT}\n\n${JSON.stringify(json, null, 2)}`,
    temperature: 0.2,
  });
  try {
    // Strip potential markdown code fence
    const cleaned = result.replace(/^```json?\n?/g, '').replace(/\n?```$/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return json; // fallback to original on parse error
  }
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { type, id } = await request.json();

  try {
    if (type === 'landing-section') {
      const section = await prisma.landingSection.findUnique({ where: { id } });
      if (!section) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const [title_en, subtitle_en, content_en] = await Promise.all([
        translateText(section.title),
        section.subtitle ? translateText(section.subtitle) : Promise.resolve(null),
        translateJson(section.content),
      ]);

      await prisma.landingSection.update({
        where: { id },
        data: { title_en, subtitle_en, content_en: content_en as object },
      });

      return NextResponse.json({ success: true, title_en, subtitle_en });
    }

    if (type === 'pricing-tier') {
      const tier = await prisma.pricingTier.findUnique({ where: { id } });
      if (!tier) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const [name_en, subtitle_en, features_en, ctaLabel_en] = await Promise.all([
        translateText(tier.name),
        tier.subtitle ? translateText(tier.subtitle) : Promise.resolve(null),
        translateJson(tier.features),
        translateText(tier.ctaLabel),
      ]);

      await prisma.pricingTier.update({
        where: { id },
        data: { name_en, subtitle_en, features_en: features_en as object, ctaLabel_en },
      });

      return NextResponse.json({ success: true, name_en, subtitle_en });
    }

    if (type === 'faq') {
      const faq = await prisma.faq.findUnique({ where: { id } });
      if (!faq) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const [question_en, answer_en] = await Promise.all([
        translateText(faq.question),
        translateText(faq.answer),
      ]);

      await prisma.faq.update({
        where: { id },
        data: { question_en, answer_en },
      });

      return NextResponse.json({ success: true, question_en, answer_en });
    }

    if (type === 'all-landing') {
      const sections = await prisma.landingSection.findMany();
      let translated = 0;
      for (const section of sections) {
        const [title_en, subtitle_en, content_en] = await Promise.all([
          translateText(section.title),
          section.subtitle ? translateText(section.subtitle) : Promise.resolve(null),
          translateJson(section.content),
        ]);
        await prisma.landingSection.update({
          where: { id: section.id },
          data: { title_en, subtitle_en, content_en: content_en as object },
        });
        translated++;
      }
      return NextResponse.json({ success: true, translated });
    }

    if (type === 'all-pricing') {
      const tiers = await prisma.pricingTier.findMany();
      let translated = 0;
      for (const tier of tiers) {
        const [name_en, subtitle_en, features_en, ctaLabel_en] = await Promise.all([
          translateText(tier.name),
          tier.subtitle ? translateText(tier.subtitle) : Promise.resolve(null),
          translateJson(tier.features),
          translateText(tier.ctaLabel),
        ]);
        await prisma.pricingTier.update({
          where: { id: tier.id },
          data: { name_en, subtitle_en, features_en: features_en as object, ctaLabel_en },
        });
        translated++;
      }
      return NextResponse.json({ success: true, translated });
    }

    if (type === 'all-faq') {
      const faqs = await prisma.faq.findMany();
      let translated = 0;
      for (const faq of faqs) {
        const [question_en, answer_en] = await Promise.all([
          translateText(faq.question),
          translateText(faq.answer),
        ]);
        await prisma.faq.update({
          where: { id: faq.id },
          data: { question_en, answer_en },
        });
        translated++;
      }
      return NextResponse.json({ success: true, translated });
    }

    if (type === 'article') {
      const article = await prisma.article.findUnique({ where: { id } });
      if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const [title_en, excerpt_en, body_en] = await Promise.all([
        translateText(article.title),
        translateText(article.excerpt),
        translateText(article.body),
      ]);

      await prisma.article.update({
        where: { id },
        data: { title_en, excerpt_en, body_en },
      });

      return NextResponse.json({ success: true, title_en, excerpt_en });
    }

    if (type === 'page-meta') {
      const meta = await prisma.pageMeta.findUnique({ where: { id } });
      if (!meta) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const [title_en, description_en, ogTitle_en, ogDescription_en] = await Promise.all([
        translateText(meta.title),
        meta.description ? translateText(meta.description) : Promise.resolve(null),
        meta.ogTitle ? translateText(meta.ogTitle) : Promise.resolve(null),
        meta.ogDescription ? translateText(meta.ogDescription) : Promise.resolve(null),
      ]);

      await prisma.pageMeta.update({
        where: { id },
        data: { title_en, description_en, ogTitle_en, ogDescription_en, en_synced_at: new Date() },
      });

      return NextResponse.json({ success: true, title_en, description_en });
    }

    if (type === 'all-page-meta') {
      const metas = await prisma.pageMeta.findMany();
      let translated = 0;
      for (const meta of metas) {
        const [title_en, description_en, ogTitle_en, ogDescription_en] = await Promise.all([
          translateText(meta.title),
          meta.description ? translateText(meta.description) : Promise.resolve(null),
          meta.ogTitle ? translateText(meta.ogTitle) : Promise.resolve(null),
          meta.ogDescription ? translateText(meta.ogDescription) : Promise.resolve(null),
        ]);
        await prisma.pageMeta.update({
          where: { id: meta.id },
          data: { title_en, description_en, ogTitle_en, ogDescription_en, en_synced_at: new Date() },
        });
        translated++;
      }
      return NextResponse.json({ success: true, translated });
    }

    if (type === 'all-articles') {
      const articles = await prisma.article.findMany();
      let translated = 0;
      for (const article of articles) {
        const [title_en, excerpt_en, body_en] = await Promise.all([
          translateText(article.title),
          translateText(article.excerpt),
          translateText(article.body),
        ]);
        await prisma.article.update({
          where: { id: article.id },
          data: { title_en, excerpt_en, body_en },
        });
        translated++;
      }
      return NextResponse.json({ success: true, translated });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: 'Translation failed', details: String(err) },
      { status: 500 }
    );
  }
}
