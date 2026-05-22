/**
 * Email Shell — institutional-grade unified wrapper untuk semua transactional
 * emails (welcome, verify, activation, cancel, renewal, promo broadcast).
 *
 * Pak Abdullah audit 2026-05-22: "perbaiki semuanya desainnya, institusional
 * grade". Sebelumnya tiap template punya inline styling sendiri — inconsistent.
 * Now: single shell, all templates pass content + meta = uniform brand experience.
 *
 * Design language:
 *   - Dark navy background (#0B1220) — institutional, premium
 *   - Card #141B2D dengan subtle border + amber ring di outer wrap
 *   - Amber #F5B547 accent untuk eyebrow, CTA button, dividers
 *   - Body text putih off-white (#FAFAF7) primary, muted (#9FA3AE) secondary
 *   - Helvetica/Arial font fallback (email-safe)
 *   - Max-width 560px (optimal email reading width)
 *   - Footer with company info, address, social links, unsub
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://babahalgo.com';
const LOGO_URL = `${APP_URL}/logo/babahalgo-icon-256.png`;

const I18N = {
  id: {
    helpEyebrow: 'Bantuan',
    helpContact: 'Balas email ini atau hubungi tim kami:',
    legalEyebrow: 'Legal',
    legalCompany: 'CV Babah Digital · BabahAlgo Trading Platform',
    legalAddress: 'Indonesia · babahalgo.com',
    legalUnsub: 'Kelola notifikasi email',
    legalDisclaimer: 'Trading berisiko tinggi. Kinerja masa lalu tidak menjamin hasil masa depan. Anda bertanggung jawab penuh atas keputusan trading.',
    socialFollow: 'Ikuti kami:',
  },
  en: {
    helpEyebrow: 'Support',
    helpContact: 'Reply to this email or contact our team:',
    legalEyebrow: 'Legal',
    legalCompany: 'CV Babah Digital · BabahAlgo Trading Platform',
    legalAddress: 'Indonesia · babahalgo.com',
    legalUnsub: 'Manage email notifications',
    legalDisclaimer: 'Trading involves significant risk. Past performance does not guarantee future results. You are solely responsible for your trading decisions.',
    socialFollow: 'Follow us:',
  },
};

export interface EmailShellParams {
  /** Locale untuk i18n footer / disclaimer */
  locale: 'id' | 'en';
  /** Email subject — disetel di outer call, not used dalam HTML */
  subject: string;
  /** Optional eyebrow above title (e.g. "WELCOME", "VERIFY") */
  eyebrow?: string;
  /** Main title H1 */
  title: string;
  /** HTML content body — paragraphs, lists, etc */
  bodyHtml: string;
  /** Primary CTA button — opsional */
  cta?: { label: string; href: string };
  /** Secondary action link below CTA — opsional (e.g. "Open portal") */
  secondaryCta?: { label: string; href: string };
  /** Hide footer disclaimer (untuk promo email yang tidak butuh) */
  hideDisclaimer?: boolean;
  /** Hide help section (default show) */
  hideHelp?: boolean;
}

/** Wrap content dalam institutional-grade email shell.
 *  Returns full HTML string ready untuk sendEmail(). */
export function renderEmailShell(params: EmailShellParams): string {
  const { locale, subject, eyebrow, title, bodyHtml, cta, secondaryCta, hideDisclaimer, hideHelp } = params;
  const t = I18N[locale];
  const isEn = locale === 'en';

  const ctaButton = cta
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px 0;">
        <tr><td style="background: #F5B547; border-radius: 8px; box-shadow: 0 4px 12px rgba(245,181,71,0.25);">
          <a href="${cta.href}" style="display: inline-block; padding: 14px 32px; color: #0B1220; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 0.02em;">${cta.label} →</a>
        </td></tr>
      </table>`
    : '';

  const secondaryLink = secondaryCta
    ? `<p style="font-size: 13px; color: rgba(250,250,247,0.65); margin: 0 0 24px 0;"><a href="${secondaryCta.href}" style="color: #F5B547; text-decoration: none;">${secondaryCta.label} →</a></p>`
    : '';

  const helpBlock = hideHelp
    ? ''
    : `
      <div style="margin-top: 32px; padding: 20px; background: rgba(245,181,71,0.06); border-left: 3px solid #F5B547; border-radius: 0 8px 8px 0;">
        <div style="font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #F5B547; font-weight: 600; margin-bottom: 6px;">${t.helpEyebrow}</div>
        <p style="font-size: 13px; line-height: 1.6; color: rgba(250,250,247,0.85); margin: 0;">
          ${t.helpContact} <a href="mailto:hello@babahalgo.com" style="color: #F5B547; text-decoration: none; font-weight: 500;">hello@babahalgo.com</a>
        </p>
      </div>`;

  const disclaimerBlock = hideDisclaimer
    ? ''
    : `<p style="font-size: 11px; line-height: 1.5; color: rgba(250,250,247,0.4); margin: 16px 0 0 0; font-style: italic;">${t.legalDisclaimer}</p>`;

  const eyebrowBlock = eyebrow
    ? `<div style="font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #F5B547; font-weight: 700; margin-bottom: 14px;">${eyebrow}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background: #0B1220; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #FAFAF7;">
  <!-- Hidden preview text (Gmail/Outlook preview snippet) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${title}</div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #0B1220;">
    <tr>
      <td align="center" style="padding: 32px 16px;">

        <!-- ─── HEADER LOGO ──────────────────── -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 560px;">
          <tr>
            <td align="center" style="padding: 0 0 24px 0;">
              <a href="${APP_URL}" style="text-decoration: none;">
                <img src="${LOGO_URL}" alt="BabahAlgo" width="48" height="48" style="display: block; border: 0;">
              </a>
              <div style="font-size: 18px; font-weight: 700; color: #FAFAF7; margin-top: 12px; letter-spacing: 0.02em;">BabahAlgo</div>
              <div style="font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(245,181,71,0.85); margin-top: 4px; font-weight: 500;">Quantitative Trading Infrastructure</div>
            </td>
          </tr>
        </table>

        <!-- ─── MAIN CARD ──────────────────── -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 560px; background: #141B2D; border-radius: 14px; border: 1px solid rgba(245,245,247,0.08); box-shadow: 0 8px 32px rgba(0,0,0,0.4);">
          <tr>
            <td style="padding: 36px 32px 32px 32px;">
              ${eyebrowBlock}
              <h1 style="font-size: 24px; font-weight: 700; line-height: 1.25; margin: 0 0 20px 0; color: #FAFAF7; letter-spacing: -0.01em;">${title}</h1>
              <div style="font-size: 15px; line-height: 1.65; color: rgba(250,250,247,0.85); margin: 0 0 24px 0;">
                ${bodyHtml}
              </div>
              ${ctaButton}
              ${secondaryLink}
              ${helpBlock}
            </td>
          </tr>
        </table>

        <!-- ─── FOOTER ──────────────────── -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 560px;">
          <tr>
            <td style="padding: 24px 8px 0 8px;">
              <div style="font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(250,250,247,0.4); font-weight: 600; margin-bottom: 8px;">${t.legalEyebrow}</div>
              <p style="font-size: 12px; line-height: 1.55; color: rgba(250,250,247,0.55); margin: 0 0 4px 0;">${t.legalCompany}</p>
              <p style="font-size: 12px; line-height: 1.55; color: rgba(250,250,247,0.45); margin: 0 0 12px 0;">${t.legalAddress}</p>
              <p style="font-size: 12px; line-height: 1.5; color: rgba(250,250,247,0.45); margin: 0 0 8px 0;">
                <a href="${APP_URL}/portal/account/notifications" style="color: rgba(245,181,71,0.8); text-decoration: none;">${t.legalUnsub}</a>
                · <a href="${APP_URL}/legal/privacy" style="color: rgba(245,181,71,0.8); text-decoration: none;">${isEn ? 'Privacy' : 'Privasi'}</a>
                · <a href="${APP_URL}/legal/terms" style="color: rgba(245,181,71,0.8); text-decoration: none;">${isEn ? 'Terms' : 'Syarat'}</a>
              </p>
              ${disclaimerBlock}
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}
