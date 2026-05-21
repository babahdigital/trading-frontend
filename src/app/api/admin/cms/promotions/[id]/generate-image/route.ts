/**
 * POST /api/admin/cms/promotions/[id]/generate-image?locale=id|en
 *
 * Trigger AI image generation untuk Promotion hero — failover chain
 * OpenRouter Gemini → Pollinations FLUX. Persist file ke
 * /public/uploads/promotions/ + update Promotion.heroImageUrl (id) atau
 * heroImageUrl_en (en).
 *
 * Bilingual support per Pak Abdullah directive 2026-05-21: image juga
 * multi-bahasa. Default locale=id; admin trigger 2x untuk generate kedua.
 *
 * Admin can regenerate (override existing hero) — old file kept on disk.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';
import { generatePromoHeroImage } from '@/lib/ai/promo-image-generator';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/cms/promotions/generate-image');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = requireAdmin(request);
  if (guard) return guard;

  const { id } = await params;

  // Bilingual: accept ?locale=id|en (default id) atau body { locale }
  const localeParam = request.nextUrl.searchParams.get('locale')?.toLowerCase();
  let locale: 'id' | 'en' = localeParam === 'en' ? 'en' : 'id';
  try {
    const body = await request.clone().json();
    if (body?.locale === 'en' || body?.locale === 'id') locale = body.locale;
  } catch {
    // body optional
  }

  const promo = await prisma.promotion.findUnique({
    where: { id },
    include: { calendarEvent: { select: { templateKey: true, name: true } } },
  });
  if (!promo) {
    return NextResponse.json({ error: 'promotion_not_found' }, { status: 404 });
  }

  // Resolve templateKey:
  const templateKey = promo.calendarEvent?.templateKey
    ?? (promo.slug.startsWith('flash') ? 'flash-sale' : 'default');

  // Optional tier name — kalau applicable tier cuma 1, embed di prompt
  const applicableTiers = Array.isArray(promo.applicableTiers) ? (promo.applicableTiers as string[]) : [];
  let tierName: string | undefined;
  if (applicableTiers.length === 1) {
    const tier = await prisma.pricingTier.findUnique({
      where: { slug: applicableTiers[0] },
      select: { name: true, name_en: true },
    });
    tierName = locale === 'en' ? (tier?.name_en ?? tier?.name) : tier?.name;
  }

  // Discount text per locale
  let discountText: string | undefined;
  if (Number(promo.discountValue) > 0) {
    discountText = promo.discountType === 'PERCENT'
      ? `${promo.discountValue}% ${locale === 'en' ? 'off' : 'diskon'}`
      : `Rp ${Number(promo.discountValue).toLocaleString('id-ID')} off`;
  }

  try {
    // Locale-aware naming: append -id atau -en untuk identification di disk
    const localeSlug = `${promo.slug}-${locale}`;
    const promoName = locale === 'en' ? (promo.name_en ?? promo.name) : promo.name;
    const result = await generatePromoHeroImage(localeSlug, {
      templateKey,
      promoName,
      tierName,
      discountText,
    });

    // Save ke field sesuai locale. aiImagePrompt + aiGenerated tetap di
    // common field (last-generated wins untuk audit reference).
    const updateData = locale === 'en'
      ? { heroImageUrl_en: result.url, aiImagePrompt: result.prompt, aiGenerated: true }
      : { heroImageUrl: result.url, aiImagePrompt: result.prompt, aiGenerated: true };

    const updated = await prisma.promotion.update({
      where: { id },
      data: updateData,
    });

    revalidatePath('/');
    revalidatePath('/pricing');

    log.info(`Image generated promoId=${id} locale=${locale} provider=${result.provider} url=${result.url}`);

    return NextResponse.json({
      ok: true,
      url: result.url,
      locale,
      provider: result.provider,
      sizeBytes: result.sizeBytes,
      promotion: updated,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    log.error(`Generate failed promoId=${id} locale=${locale}: ${message}`);
    return NextResponse.json({ error: 'generation_failed', message }, { status: 500 });
  }
}
