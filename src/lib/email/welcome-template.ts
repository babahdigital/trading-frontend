/**
 * Bilingual welcome email — institutional-grade via shared shell.
 * Pak Abdullah audit 2026-05-22: redesign semua template institusional.
 */
import type { AppLocale } from '@/lib/i18n/server-locale';
import { renderEmailShell } from './shell';

interface WelcomeEmailParams {
  name: string;
  tier: string;
}

interface WelcomeEmailContent {
  subject: string;
  html: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://babahalgo.com';

export function renderWelcomeEmail(locale: AppLocale, params: WelcomeEmailParams): WelcomeEmailContent {
  const { name, tier } = params;
  const tierDisplay = tier.replace(/_/g, ' ');
  const isEn = locale === 'en';

  const subject = isEn ? 'Welcome to BabahAlgo' : 'Selamat Datang di BabahAlgo';

  const bodyHtml = isEn
    ? `
      <p style="margin: 0 0 12px 0;"><strong style="color: #FAFAF7;">Hi ${name},</strong></p>
      <p style="margin: 0 0 16px 0;">Thank you for registering with <strong style="color: #F5B547;">BabahAlgo</strong>. Your <strong>${tierDisplay}</strong> account is being set up.</p>
      <div style="margin: 24px 0; padding: 20px; background: rgba(255,255,255,0.03); border-radius: 8px;">
        <div style="font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(245,181,71,0.9); font-weight: 600; margin-bottom: 12px;">Next Steps</div>
        <ol style="margin: 0; padding-left: 20px; color: rgba(250,250,247,0.85); font-size: 14px; line-height: 1.7;">
          <li>Account activation within 24 hours</li>
          <li>Set up Telegram notifications via portal</li>
          <li>Verify email if you haven't yet</li>
          <li>Trading signals delivered automatically once active</li>
        </ol>
      </div>`
    : `
      <p style="margin: 0 0 12px 0;"><strong style="color: #FAFAF7;">Halo ${name},</strong></p>
      <p style="margin: 0 0 16px 0;">Terima kasih telah mendaftar di <strong style="color: #F5B547;">BabahAlgo</strong>. Akun <strong>${tierDisplay}</strong> Anda sedang disiapkan.</p>
      <div style="margin: 24px 0; padding: 20px; background: rgba(255,255,255,0.03); border-radius: 8px;">
        <div style="font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(245,181,71,0.9); font-weight: 600; margin-bottom: 12px;">Langkah Selanjutnya</div>
        <ol style="margin: 0; padding-left: 20px; color: rgba(250,250,247,0.85); font-size: 14px; line-height: 1.7;">
          <li>Aktivasi akun dalam 24 jam</li>
          <li>Setup notifikasi Telegram via portal</li>
          <li>Verifikasi email jika belum</li>
          <li>Sinyal trading otomatis terkirim setelah aktif</li>
        </ol>
      </div>`;

  const html = renderEmailShell({
    locale,
    subject,
    eyebrow: isEn ? 'Welcome' : 'Selamat Datang',
    title: isEn ? `Welcome aboard, ${name}` : `Selamat datang, ${name}`,
    bodyHtml,
    cta: {
      label: isEn ? 'Open Portal' : 'Buka Portal',
      href: `${APP_URL}/portal/account`,
    },
  });

  return { subject, html };
}
