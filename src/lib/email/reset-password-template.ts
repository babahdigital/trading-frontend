/**
 * Bilingual password-reset email templates.
 * Selected by locale detected from the forgot-password request
 * (NEXT_LOCALE cookie / accept-language header).
 *
 * Mirrors structural pattern of welcome-template.ts: subject + html-only,
 * inline-styled, max-width 600px, brand amber (#d97706), security note,
 * support contact mailto. The reset URL embeds the raw 32-byte hex token
 * issued by the API; the corresponding SHA-256 hash is what's persisted.
 */
import type { AppLocale } from '@/lib/i18n/server-locale';

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

  if (locale === 'en') {
    return {
      subject: 'Reset your BabahAlgo password',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
        <h2 style="color:#d97706">Hi ${name},</h2>
        <p>We received a request to reset the password for your <strong>BabahAlgo</strong> account.</p>
        <p>Click the button below to reset your password:</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${resetUrl}"
             style="display:inline-block;padding:14px 28px;background:#d97706;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600">
            Reset Password
          </a>
        </p>
        <p style="font-size:13px;color:#666">
          Or copy this link into your browser:<br>
          <a href="${resetUrl}" style="color:#d97706;word-break:break-all">${resetUrl}</a>
        </p>
        <p style="margin-top:24px;padding:12px 16px;background:#fef3c7;border-radius:8px;font-size:14px">
          <strong>This link expires in 1 hour.</strong>
        </p>
        <p style="margin-top:16px;padding:12px 16px;background:#f3f4f6;border-radius:8px;font-size:13px;color:#555">
          If you didn't request a password reset, ignore this email — your password will remain unchanged.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="font-size:12px;color:#999">
          Need help? Contact us at <a href="mailto:hello@babahalgo.com">hello@babahalgo.com</a>
        </p>
      </div>`,
    };
  }

  // Default: Indonesian
  return {
    subject: 'Reset Password BabahAlgo',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
      <h2 style="color:#d97706">Halo ${name},</h2>
      <p>Kami menerima permintaan untuk mereset password akun <strong>BabahAlgo</strong> Anda.</p>
      <p>Klik tombol di bawah untuk reset password Anda:</p>
      <p style="text-align:center;margin:32px 0">
        <a href="${resetUrl}"
           style="display:inline-block;padding:14px 28px;background:#d97706;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600">
          Reset Password
        </a>
      </p>
      <p style="font-size:13px;color:#666">
        Atau salin tautan ini ke browser Anda:<br>
        <a href="${resetUrl}" style="color:#d97706;word-break:break-all">${resetUrl}</a>
      </p>
      <p style="margin-top:24px;padding:12px 16px;background:#fef3c7;border-radius:8px;font-size:14px">
        <strong>Tautan ini berlaku 1 jam.</strong>
      </p>
      <p style="margin-top:16px;padding:12px 16px;background:#f3f4f6;border-radius:8px;font-size:13px;color:#555">
        Jika Anda tidak meminta reset, abaikan email ini — password Anda tetap tidak berubah.
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="font-size:12px;color:#999">
        Butuh bantuan? Hubungi kami di <a href="mailto:hello@babahalgo.com">hello@babahalgo.com</a>
      </p>
    </div>`,
  };
}
