/**
 * Promo broadcast email — institutional-grade via shared shell.
 *
 * Pak Abdullah audit 2026-05-22: "email promo bila ada kirimkan ke user juga".
 * Dispatched via /api/admin/cms/broadcast atau auto-trigger dari
 * promo-strategist saat promo high-confidence di-create.
 *
 * Locale-aware — subscriber.locale resolves bilingual rendering.
 */
import { renderEmailShell } from './shell';

export interface PromoBroadcastParams {
  recipientName?: string;
  promoTitle: string;
  promoBody: string;
  ctaLabel: string;
  ctaUrl: string;
  discountText?: string;
  heroImageUrl?: string;
  validUntil?: string;
}

export interface PromoBroadcastContent {
  subject: string;
  html: string;
}

export function renderPromoBroadcast(
  locale: 'id' | 'en',
  params: PromoBroadcastParams,
): PromoBroadcastContent {
  const { recipientName, promoTitle, promoBody, ctaLabel, ctaUrl, discountText, heroImageUrl, validUntil } = params;
  const isEn = locale === 'en';

  const subject = isEn
    ? `${promoTitle} — BabahAlgo`
    : `${promoTitle} — BabahAlgo`;

  const heroBlock = heroImageUrl
    ? `<div style="margin: -8px -8px 24px -8px; border-radius: 10px; overflow: hidden;">
        <img src="${heroImageUrl}" alt="${promoTitle}" width="528" style="display: block; width: 100%; height: auto; border: 0;">
      </div>`
    : '';

  const discountBadge = discountText
    ? `<div style="margin: 0 0 18px 0;">
        <span style="display: inline-block; background: linear-gradient(135deg, #F5B547 0%, #E89E2F 100%); color: #0B1220; padding: 8px 16px; border-radius: 999px; font-size: 13px; font-weight: 800; letter-spacing: 0.02em; box-shadow: 0 4px 12px rgba(245,181,71,0.3);">
          ${isEn ? 'Save' : 'Hemat'} ${discountText}
        </span>
      </div>`
    : '';

  const validBlock = validUntil
    ? `<p style="margin: 0 0 0 0; font-size: 12px; color: rgba(250,250,247,0.55);">
        ${isEn ? 'Offer valid until' : 'Berlaku sampai'} <strong style="color: rgba(250,250,247,0.85);">${validUntil}</strong>
      </p>`
    : '';

  const greeting = recipientName
    ? `<p style="margin: 0 0 14px 0;"><strong style="color: #FAFAF7;">${isEn ? 'Hi' : 'Halo'} ${recipientName},</strong></p>`
    : '';

  const bodyHtml = `
    ${heroBlock}
    ${greeting}
    ${discountBadge}
    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: rgba(250,250,247,0.88);">${promoBody}</p>
    ${validBlock}
  `;

  const html = renderEmailShell({
    locale,
    subject,
    eyebrow: isEn ? 'Special Offer' : 'Penawaran Spesial',
    title: promoTitle,
    bodyHtml,
    cta: { label: ctaLabel, href: ctaUrl },
    secondaryCta: {
      label: isEn ? 'See all plans' : 'Lihat semua paket',
      href: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://babahalgo.com'}/pricing`,
    },
  });

  return { subject, html };
}
