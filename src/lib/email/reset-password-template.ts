/**
 * Bilingual password-reset email — institutional-grade via shared shell.
 * Pak Abdullah audit 2026-05-22: redesign semua institusional.
 */
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
      <p style="margin: 0 0 12px 0;"><strong style="color: #FAFAF7;">Hi ${name},</strong></p>
      <p style="margin: 0 0 16px 0;">We received a request to reset the password for your <strong style="color: #F5B547;">BabahAlgo</strong> account. Click the button below to choose a new password.</p>
      <div style="margin: 20px 0; padding: 14px 18px; background: rgba(245,181,71,0.08); border-radius: 8px; border-left: 3px solid #F5B547;">
        <p style="margin: 0; font-size: 13px; line-height: 1.55; color: rgba(250,250,247,0.85);"><strong>Security note:</strong> this link expires in 1 hour. If you didn't request a password reset, ignore this email — your password remains unchanged.</p>
      </div>`
    : `
      <p style="margin: 0 0 12px 0;"><strong style="color: #FAFAF7;">Halo ${name},</strong></p>
      <p style="margin: 0 0 16px 0;">Kami menerima permintaan reset password akun <strong style="color: #F5B547;">BabahAlgo</strong> Anda. Klik tombol di bawah untuk memilih password baru.</p>
      <div style="margin: 20px 0; padding: 14px 18px; background: rgba(245,181,71,0.08); border-radius: 8px; border-left: 3px solid #F5B547;">
        <p style="margin: 0; font-size: 13px; line-height: 1.55; color: rgba(250,250,247,0.85);"><strong>Catatan keamanan:</strong> tautan ini berlaku 1 jam. Jika Anda tidak meminta reset, abaikan email ini — password tetap tidak berubah.</p>
      </div>`;

  const html = renderEmailShell({
    locale,
    subject,
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
