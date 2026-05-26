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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://babahalgo.com';

export function renderPromoBroadcast(
  locale: 'id' | 'en',
  params: PromoBroadcastParams,
): PromoBroadcastContent {
  const { recipientName, promoTitle, promoBody, ctaLabel, ctaUrl, discountText, heroImageUrl, validUntil } = params;
  const isEn = locale === 'en';

  const subject = `${promoTitle} — BabahAlgo`;

  const heroBlock = heroImageUrl
    ? `<div style="margin: -4px -8px 24px -8px; border-radius: 10px; overflow: hidden;">
        <img src="${heroImageUrl.startsWith('/') ? APP_URL + heroImageUrl : heroImageUrl}" alt="${promoTitle}" width="528" style="display: block; width: 100%; height: auto; border: 0;">
      </div>`
    : '';

  const discountBadge = discountText
    ? `<div style="margin: 0 0 20px 0;">
        <span style="display: inline-block; background: linear-gradient(135deg, #F5B547 0%, #E8A030 100%); color: #0B1220; padding: 8px 18px; border-radius: 999px; font-size: 14px; font-weight: 800; letter-spacing: 0.03em; box-shadow: 0 4px 14px rgba(245,181,71,0.3);">
          ${isEn ? 'Save' : 'Hemat'} ${discountText}
        </span>
      </div>`
    : '';

  const validBlock = validUntil
    ? `<div style="margin: 16px 0 0 0; padding: 10px 14px; background: rgba(255,255,255,0.03); border-radius: 6px; display: inline-block;">
        <span style="font-size: 12px; color: rgba(250,250,247,0.55);">
          ${isEn ? 'Valid until' : 'Berlaku sampai'} <strong style="color: rgba(250,250,247,0.9);">${validUntil}</strong>
        </span>
      </div>`
    : '';

  const greeting = recipientName
    ? `<p style="margin: 0 0 16px 0;">${isEn ? 'Hi' : 'Halo'} <strong style="color: #FAFAF7;">${recipientName}</strong>,</p>`
    : '';

  const bodyHtml = `
    ${heroBlock}
    ${greeting}
    ${discountBadge}
    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; color: rgba(250,250,247,0.85);">${promoBody}</p>
    ${validBlock}
  `;

  const html = renderEmailShell({
    locale,
    subject,
    preheader: discountText
      ? (isEn ? `${discountText} off — ${promoTitle}` : `Hemat ${discountText} — ${promoTitle}`)
      : promoTitle,
    eyebrow: isEn ? 'Special Offer' : 'Penawaran Spesial',
    title: promoTitle,
    bodyHtml,
    cta: { label: ctaLabel, href: ctaUrl },
    secondaryCta: {
      label: isEn ? 'See all plans' : 'Lihat semua paket',
      href: `${APP_URL}/pricing`,
    },
  });

  return { subject, html };
}
