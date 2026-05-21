/**
 * POST /api/admin/cms/promotions/[id]/generate-image
 *
 * Trigger AI image generation untuk Promotion hero — failover chain
 * OpenRouter Gemini → Pollinations FLUX. Persist file ke
 * /public/uploads/promotions/ + update Promotion.heroImageUrl + aiImagePrompt.
 *
 * Admin can regenerate (override existing hero) — old file kept on disk
 * (no cascade delete, untuk audit + rollback kalau perlu).
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
  const promo = await prisma.promotion.findUnique({
    where: { id },
    include: { calendarEvent: { select: { templateKey: true, name: true } } },
  });
  if (!promo) {
    return NextResponse.json({ error: 'promotion_not_found' }, { status: 404 });
  }

  // Resolve templateKey:
  // 1. Linked CalendarEvent templateKey (e.g. lebaran-2026 → lebaran)
  // 2. Promo slug prefix match (e.g. flash-sale-q4 → flash-sale)
  // 3. Default 'default' (fintech generic)
  const templateKey = promo.calendarEvent?.templateKey
    ?? (promo.slug.startsWith('flash') ? 'flash-sale' : 'default');

  // Optional tier name — kalau applicable tier cuma 1, embed di prompt
  const applicableTiers = Array.isArray(promo.applicableTiers) ? (promo.applicableTiers as string[]) : [];
  let tierName: string | undefined;
  if (applicableTiers.length === 1) {
    const tier = await prisma.pricingTier.findUnique({
      where: { slug: applicableTiers[0] },
      select: { name: true },
    });
    tierName = tier?.name;
  }

  // Discount text untuk prompt context (e.g. "20% off", "Rp 50K off")
  let discountText: string | undefined;
  if (Number(promo.discountValue) > 0) {
    discountText = promo.discountType === 'PERCENT'
      ? `${promo.discountValue}% off`
      : `Rp ${Number(promo.discountValue).toLocaleString('id-ID')} off`;
  }

  try {
    const result = await generatePromoHeroImage(promo.slug, {
      templateKey,
      promoName: promo.name,
      tierName,
      discountText,
    });

    const updated = await prisma.promotion.update({
      where: { id },
      data: {
        heroImageUrl: result.url,
        aiImagePrompt: result.prompt,
        aiGenerated: true,
      },
    });

    revalidatePath('/');
    revalidatePath('/pricing');

    log.info(`Image generated promoId=${id} provider=${result.provider} url=${result.url}`);

    return NextResponse.json({
      ok: true,
      url: result.url,
      provider: result.provider,
      sizeBytes: result.sizeBytes,
      promotion: updated,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    log.error(`Generate failed promoId=${id}: ${message}`);
    return NextResponse.json({ error: 'generation_failed', message }, { status: 500 });
  }
}
