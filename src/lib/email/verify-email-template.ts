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
      <p style="margin: 0 0 16px 0;">Hi <strong style="color: #FAFAF7;">${name}</strong>,</p>
      <p style="margin: 0 0 20px 0;">Confirm your email address to secure your <strong style="color: #F5B547;">BabahAlgo</strong> account and unlock full access to trading signals and portfolio dashboard.</p>
      <div style="margin: 20px 0; padding: 14px 18px; background: rgba(245,181,71,0.06); border-radius: 8px; border-left: 3px solid rgba(245,181,71,0.5);">
        <p style="margin: 0; font-size: 13px; line-height: 1.55; color: rgba(250,250,247,0.8);">
          <strong style="color: rgba(250,250,247,0.95);">⏱ Expires in ${expiresInHours} hours.</strong> If you didn't create this account, safely ignore this email — no action will be taken.
        </p>
      </div>`
    : `
      <p style="margin: 0 0 16px 0;">Halo <strong style="color: #FAFAF7;">${name}</strong>,</p>
      <p style="margin: 0 0 20px 0;">Konfirmasi alamat email Anda untuk mengamankan akun <strong style="color: #F5B547;">BabahAlgo</strong> dan mengaktifkan akses penuh ke sinyal trading dan dashboard portofolio.</p>
      <div style="margin: 20px 0; padding: 14px 18px; background: rgba(245,181,71,0.06); border-radius: 8px; border-left: 3px solid rgba(245,181,71,0.5);">
        <p style="margin: 0; font-size: 13px; line-height: 1.55; color: rgba(250,250,247,0.8);">
          <strong style="color: rgba(250,250,247,0.95);">⏱ Berlaku ${expiresInHours} jam.</strong> Jika Anda tidak mendaftar, abaikan email ini — tidak ada tindakan yang diambil.
        </p>
      </div>`;

  const html = renderEmailShell({
    locale,
    subject,
    preheader: isEn
      ? `Confirm your email to activate your BabahAlgo account. Link expires in ${expiresInHours}h.`
      : `Konfirmasi email untuk aktivasi akun BabahAlgo. Tautan berlaku ${expiresInHours} jam.`,
    eyebrow: isEn ? 'Email Verification' : 'Verifikasi Email',
    title: isEn ? 'Confirm your email address' : 'Konfirmasi alamat email Anda',
    bodyHtml,
    cta: {
      label: isEn ? 'Verify Email' : 'Verifikasi Email',
      href: verifyUrl,
    },
  });

  return { subject, html };
}
