/**
 * Email verification template.
 * Sent post-registration dengan magic link `/api/auth/verify-email?token=<raw>`.
 */
import type { AppLocale } from '@/lib/i18n/server-locale';

interface VerifyEmailParams {
  name: string;
  verifyUrl: string;
  expiresInHours: number;
}

interface VerifyEmailContent {
  subject: string;
  html: string;
}

export function renderVerifyEmail(locale: AppLocale, params: VerifyEmailParams): VerifyEmailContent {
  const { name, verifyUrl, expiresInHours } = params;
  const isEn = locale === 'en';

  const subject = isEn
    ? 'Verify your BabahAlgo email'
    : 'Verifikasi email BabahAlgo Anda';

  const greeting = isEn ? `Hi ${name},` : `Halo ${name},`;
  const intro = isEn
    ? 'Welcome to BabahAlgo! Confirm your email address to secure your account.'
    : 'Selamat datang di BabahAlgo! Konfirmasi alamat email Anda untuk mengamankan akun.';
  const cta = isEn ? 'Verify Email' : 'Verifikasi Email';
  const expireNote = isEn
    ? `This link expires in ${expiresInHours} hours.`
    : `Tautan ini berlaku ${expiresInHours} jam.`;
  const ignoreNote = isEn
    ? "If you didn't sign up for BabahAlgo, you can safely ignore this email."
    : 'Jika Anda tidak mendaftar di BabahAlgo, abaikan email ini.';
  const footerSig = isEn ? '— BabahAlgo Team' : '— Tim BabahAlgo';

  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8">
<title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#0B1220; color:#FAFAF7; margin:0; padding:0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0B1220;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;background:#141B2D;border-radius:12px;border:1px solid rgba(245,245,247,0.08);">
          <tr><td style="padding:32px;">
            <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#F5B547;margin-bottom:8px;">BabahAlgo</div>
            <h1 style="font-size:22px;font-weight:600;margin:0 0 16px 0;color:#FAFAF7;">${subject}</h1>
            <p style="font-size:15px;line-height:1.6;color:#FAFAF7;margin:0 0 12px 0;">${greeting}</p>
            <p style="font-size:14px;line-height:1.6;color:rgba(250,250,247,0.7);margin:0 0 24px 0;">${intro}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
              <tr><td style="background:#F5B547;border-radius:6px;">
                <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;color:#0B1220;text-decoration:none;font-weight:600;font-size:14px;">${cta}</a>
              </td></tr>
            </table>
            <p style="font-size:12px;color:rgba(250,250,247,0.5);margin:0 0 6px 0;">${expireNote}</p>
            <p style="font-size:12px;color:rgba(250,250,247,0.5);margin:0 0 24px 0;">${ignoreNote}</p>
            <hr style="border:none;border-top:1px solid rgba(245,245,247,0.08);margin:24px 0 16px 0;">
            <p style="font-size:11px;color:rgba(250,250,247,0.4);margin:0;">${footerSig}<br>CV Babah Digital · babahalgo.com</p>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
