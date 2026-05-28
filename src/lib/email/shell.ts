/**
 * Email Shell — institutional-grade unified wrapper for all transactional emails.
 *
 * Design language:
 *   - Dark navy background (#0B1220) — institutional, premium
 *   - Card #141B2D with subtle border + amber accent top-bar
 *   - Amber #F5B547 accent for eyebrow, CTA button, dividers
 *   - Body text off-white (#FAFAF7) primary, muted (#9FA3AE) secondary
 *   - Helvetica/Arial font fallback (email-safe)
 *   - Max-width 560px (optimal email reading width)
 *   - Footer: company info, social, privacy/terms, unsub, disclaimer
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://babahalgo.com';
const LOGO_URL = `${APP_URL}/logo/babahalgo-icon-256.png`;
const YEAR = new Date().getFullYear();

const I18N = {
  id: {
    helpEyebrow: 'Bantuan',
    helpContact: 'Balas email ini atau hubungi tim kami:',
    legalEyebrow: 'Legal',
    legalCompany: `© ${YEAR} CV Babah Digital · BabahAlgo`,
    legalTagline: 'Quantitative Trading Infrastructure',
    legalAddress: 'Indonesia · babahalgo.com',
    legalUnsub: 'Kelola notifikasi',
    legalDisclaimer: 'Trading berisiko tinggi. Kinerja masa lalu tidak menjamin hasil masa depan. Anda bertanggung jawab penuh atas keputusan trading. Zero-custody — modal selalu di akun broker/exchange Anda.',
    socialTelegram: 'Telegram',
  },
  en: {
    helpEyebrow: 'Support',
    helpContact: 'Reply to this email or contact our team:',
    legalEyebrow: 'Legal',
    legalCompany: `© ${YEAR} CV Babah Digital · BabahAlgo`,
    legalTagline: 'Quantitative Trading Infrastructure',
    legalAddress: 'Indonesia · babahalgo.com',
    legalUnsub: 'Manage notifications',
    legalDisclaimer: 'Trading involves significant risk. Past performance does not guarantee future results. You are solely responsible for your trading decisions. Zero-custody — capital always stays in your broker/exchange account.',
    socialTelegram: 'Telegram',
  },
};

export interface EmailShellParams {
  locale: 'id' | 'en';
  subject: string;
  preheader?: string;
  eyebrow?: string;
  title: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  hideDisclaimer?: boolean;
  hideHelp?: boolean;
  /**
   * Compliant unsubscribe URL for broadcast/marketing emails (CAN-SPAM). When
   * omitted, the footer links to the in-portal notification settings — fine for
   * transactional mail. Broadcasts should pass the configured unsubscribe URL.
   */
  unsubscribeUrl?: string;
}

export function renderEmailShell(params: EmailShellParams): string {
  const { locale, subject, preheader, eyebrow, title, bodyHtml, cta, secondaryCta, hideDisclaimer, hideHelp, unsubscribeUrl } = params;
  const t = I18N[locale];
  const isEn = locale === 'en';
  const preheaderText = preheader ?? title;

  const ctaButton = cta
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 24px 0;">
        <tr><td style="background: linear-gradient(135deg, #F5B547 0%, #E8A030 100%); border-radius: 8px; box-shadow: 0 4px 14px rgba(245,181,71,0.3);">
          <a href="${cta.href}" style="display: inline-block; padding: 14px 36px; color: #0B1220; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 0.03em;">${cta.label}&nbsp;&nbsp;→</a>
        </td></tr>
      </table>`
    : '';

  const secondaryLink = secondaryCta
    ? `<p style="font-size: 13px; color: rgba(250,250,247,0.55); margin: 0 0 24px 0;"><a href="${secondaryCta.href}" style="color: #F5B547; text-decoration: none; font-weight: 500;">${secondaryCta.label}&nbsp;→</a></p>`
    : '';

  const helpBlock = hideHelp
    ? ''
    : `
      <div style="margin-top: 32px; padding: 18px 20px; background: rgba(245,181,71,0.05); border-left: 3px solid rgba(245,181,71,0.6); border-radius: 0 8px 8px 0;">
        <div style="font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #F5B547; font-weight: 600; margin-bottom: 6px;">${t.helpEyebrow}</div>
        <p style="font-size: 13px; line-height: 1.6; color: rgba(250,250,247,0.8); margin: 0;">
          ${t.helpContact} <a href="mailto:hello@babahalgo.com" style="color: #F5B547; text-decoration: none; font-weight: 500;">hello@babahalgo.com</a>
        </p>
      </div>`;

  const disclaimerBlock = hideDisclaimer
    ? ''
    : `<div style="margin: 16px 0 0 0; padding: 12px 14px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px;">
        <p style="font-size: 11px; line-height: 1.55; color: rgba(250,250,247,0.4); margin: 0;">${t.legalDisclaimer}</p>
      </div>`;

  const eyebrowBlock = eyebrow
    ? `<div style="font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #F5B547; font-weight: 700; margin-bottom: 14px;">${eyebrow}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="${locale}" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${subject}</title>
<!--[if mso]><style>table,td{font-family:Helvetica,Arial,sans-serif!important}</style><![endif]-->
</head>
<body style="margin: 0; padding: 0; background: #0B1220; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #FAFAF7; -webkit-text-size-adjust: 100%;">
  <!-- Preheader (Gmail/Outlook preview) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #0B1220;">${preheaderText}${'&nbsp;'.repeat(40)}</div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #0B1220;">
    <tr>
      <td align="center" style="padding: 40px 16px 32px 16px;">

        <!-- HEADER -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 560px;">
          <tr>
            <td align="center" style="padding: 0 0 28px 0;">
              <a href="${APP_URL}" style="text-decoration: none;">
                <img src="${LOGO_URL}" alt="BabahAlgo" width="44" height="44" style="display: block; border: 0; border-radius: 10px;">
              </a>
              <div style="font-size: 17px; font-weight: 700; color: #FAFAF7; margin-top: 12px; letter-spacing: 0.02em;">BabahAlgo</div>
              <div style="font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(245,181,71,0.75); margin-top: 4px; font-weight: 500;">${t.legalTagline}</div>
            </td>
          </tr>
        </table>

        <!-- MAIN CARD -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 560px;">
          <!-- Amber accent top-bar -->
          <tr><td style="height: 3px; background: linear-gradient(90deg, #F5B547 0%, rgba(245,181,71,0.3) 100%); border-radius: 14px 14px 0 0; font-size: 0; line-height: 0;">&nbsp;</td></tr>
          <tr>
            <td style="background: #141B2D; border-radius: 0 0 14px 14px; border: 1px solid rgba(245,245,247,0.06); border-top: none; box-shadow: 0 8px 32px rgba(0,0,0,0.35);">
              <div style="padding: 36px 32px 32px 32px;">
                ${eyebrowBlock}
                <h1 style="font-size: 22px; font-weight: 700; line-height: 1.3; margin: 0 0 20px 0; color: #FAFAF7; letter-spacing: -0.01em;">${title}</h1>
                <div style="font-size: 15px; line-height: 1.7; color: rgba(250,250,247,0.82);">
                  ${bodyHtml}
                </div>
                ${ctaButton}
                ${secondaryLink}
                ${helpBlock}
              </div>
            </td>
          </tr>
        </table>

        <!-- FOOTER -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 560px;">
          <tr>
            <td style="padding: 28px 8px 0 8px;">
              <!-- Social -->
              <p style="font-size: 12px; margin: 0 0 14px 0;">
                <a href="https://t.me/babahalgo" style="color: rgba(245,181,71,0.7); text-decoration: none; font-weight: 500; font-size: 12px;">${t.socialTelegram}</a>
                &nbsp;·&nbsp;
                <a href="${APP_URL}" style="color: rgba(245,181,71,0.7); text-decoration: none; font-weight: 500; font-size: 12px;">babahalgo.com</a>
              </p>
              <!-- Company -->
              <p style="font-size: 11px; line-height: 1.5; color: rgba(250,250,247,0.45); margin: 0 0 4px 0;">${t.legalCompany}</p>
              <p style="font-size: 11px; line-height: 1.5; color: rgba(250,250,247,0.35); margin: 0 0 12px 0;">${t.legalAddress}</p>
              <!-- Links -->
              <p style="font-size: 11px; line-height: 1.5; color: rgba(250,250,247,0.35); margin: 0 0 8px 0;">
                <a href="${unsubscribeUrl ?? `${APP_URL}/portal/account/notifications`}" style="color: rgba(245,181,71,0.65); text-decoration: none;">${t.legalUnsub}</a>
                &nbsp;·&nbsp;
                <a href="${APP_URL}/legal/privacy" style="color: rgba(245,181,71,0.65); text-decoration: none;">${isEn ? 'Privacy' : 'Privasi'}</a>
                &nbsp;·&nbsp;
                <a href="${APP_URL}/legal/terms" style="color: rgba(245,181,71,0.65); text-decoration: none;">${isEn ? 'Terms' : 'Syarat'}</a>
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
