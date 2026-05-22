/**
 * Email verification template — institutional-grade via shared shell.
 * Sent post-registration dengan magic link `/api/auth/verify-email?token=<raw>`.
 */
import type { AppLocale } from '@/lib/i18n/server-locale';
import { renderEmailShell } from './shell';

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

  const bodyHtml = isEn
    ? `
      <p style="margin: 0 0 12px 0;"><strong style="color: #FAFAF7;">Hi ${name},</strong></p>
      <p style="margin: 0 0 12px 0;">Welcome to BabahAlgo. Confirm your email address to secure your account and unlock trading signals.</p>
      <p style="margin: 0 0 0 0; font-size: 13px; color: rgba(250,250,247,0.6);">This link expires in <strong style="color: rgba(250,250,247,0.85);">${expiresInHours} hours</strong>. If you didn't sign up, you can safely ignore this email.</p>`
    : `
      <p style="margin: 0 0 12px 0;"><strong style="color: #FAFAF7;">Halo ${name},</strong></p>
      <p style="margin: 0 0 12px 0;">Selamat datang di BabahAlgo. Konfirmasi alamat email Anda untuk mengamankan akun dan mengaktifkan sinyal trading.</p>
      <p style="margin: 0 0 0 0; font-size: 13px; color: rgba(250,250,247,0.6);">Tautan ini berlaku <strong style="color: rgba(250,250,247,0.85);">${expiresInHours} jam</strong>. Jika Anda tidak mendaftar, abaikan email ini.</p>`;

  const html = renderEmailShell({
    locale,
    subject,
    eyebrow: isEn ? 'Verify Email' : 'Verifikasi Email',
    title: isEn ? 'Confirm your email address' : 'Konfirmasi alamat email Anda',
    bodyHtml,
    cta: {
      label: isEn ? 'Verify Email' : 'Verifikasi Email',
      href: verifyUrl,
    },
  });

  return { subject, html };
}
