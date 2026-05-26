import type { AppLocale } from '@/lib/i18n/server-locale';
import { renderEmailShell } from './shell';

interface ResetPasswordEmailParams {
  name: string;
  resetUrl: string;
}

interface ResetPasswordEmailContent {
  subject: string;
  html: string;
}

export function renderResetPasswordEmail(
  locale: AppLocale,
  params: ResetPasswordEmailParams,
): ResetPasswordEmailContent {
  const { name, resetUrl } = params;
  const isEn = locale === 'en';

  const subject = isEn ? 'Reset your BabahAlgo password' : 'Reset Password BabahAlgo';

  const bodyHtml = isEn
    ? `
      <p style="margin: 0 0 16px 0;">Hi <strong style="color: #FAFAF7;">${name}</strong>,</p>
      <p style="margin: 0 0 20px 0;">We received a request to reset the password for your <strong style="color: #F5B547;">BabahAlgo</strong> account. Click the button below to choose a new password.</p>
      <div style="margin: 20px 0; padding: 16px 20px; background: rgba(245,181,71,0.06); border-radius: 8px; border-left: 3px solid rgba(245,181,71,0.5);">
        <div style="font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #F5B547; font-weight: 600; margin-bottom: 8px;">Security Notice</div>
        <ul style="margin: 0; padding-left: 16px; color: rgba(250,250,247,0.8); font-size: 13px; line-height: 1.65;">
          <li>This link expires in <strong style="color: rgba(250,250,247,0.95);">1 hour</strong></li>
          <li>If you didn't request this, ignore this email — your password stays unchanged</li>
          <li>Never share this link with anyone</li>
        </ul>
      </div>`
    : `
      <p style="margin: 0 0 16px 0;">Halo <strong style="color: #FAFAF7;">${name}</strong>,</p>
      <p style="margin: 0 0 20px 0;">Kami menerima permintaan reset password akun <strong style="color: #F5B547;">BabahAlgo</strong> Anda. Klik tombol di bawah untuk memilih password baru.</p>
      <div style="margin: 20px 0; padding: 16px 20px; background: rgba(245,181,71,0.06); border-radius: 8px; border-left: 3px solid rgba(245,181,71,0.5);">
        <div style="font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #F5B547; font-weight: 600; margin-bottom: 8px;">Catatan Keamanan</div>
        <ul style="margin: 0; padding-left: 16px; color: rgba(250,250,247,0.8); font-size: 13px; line-height: 1.65;">
          <li>Tautan ini berlaku <strong style="color: rgba(250,250,247,0.95);">1 jam</strong></li>
          <li>Jika Anda tidak meminta ini, abaikan email ini — password tetap tidak berubah</li>
          <li>Jangan bagikan tautan ini ke siapa pun</li>
        </ul>
      </div>`;

  const html = renderEmailShell({
    locale,
    subject,
    preheader: isEn
      ? 'Password reset requested. Link expires in 1 hour.'
      : 'Permintaan reset password. Tautan berlaku 1 jam.',
    eyebrow: isEn ? 'Password Reset' : 'Reset Password',
    title: isEn ? 'Reset your password' : 'Reset password Anda',
    bodyHtml,
    cta: {
      label: isEn ? 'Reset Password' : 'Reset Password',
      href: resetUrl,
    },
  });

  return { subject, html };
}
