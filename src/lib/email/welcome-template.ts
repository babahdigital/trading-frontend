import type { AppLocale } from '@/lib/i18n/server-locale';
import { renderEmailShell } from './shell';

interface WelcomeEmailParams {
  name: string;
  tier: string;
  service?: 'signal' | 'crypto' | 'vps';
}

interface WelcomeEmailContent {
  subject: string;
  html: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://babahalgo.com';

export function renderWelcomeEmail(locale: AppLocale, params: WelcomeEmailParams): WelcomeEmailContent {
  const { name, tier, service = 'signal' } = params;
  const tierDisplay = tier.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const isEn = locale === 'en';

  const subject = isEn
    ? `Welcome to BabahAlgo — ${tierDisplay}`
    : `Selamat Datang di BabahAlgo — ${tierDisplay}`;

  const portalPath = service === 'crypto' ? '/portal/crypto' : '/portal';

  const steps = isEn
    ? [
        'Account activation within 24 hours (business days)',
        service === 'crypto' ? 'Connect your Binance API key (Read + Trade only)' : 'Set up MT5 bridge connection',
        'Configure Telegram notifications in portal',
        'Verify your email address if you haven\'t yet',
      ]
    : [
        'Aktivasi akun dalam 24 jam (hari kerja)',
        service === 'crypto' ? 'Hubungkan Binance API key Anda (Read + Trade only)' : 'Setup koneksi MT5 bridge',
        'Konfigurasi notifikasi Telegram di portal',
        'Verifikasi alamat email jika belum',
      ];

  const bodyHtml = isEn
    ? `
      <p style="margin: 0 0 16px 0;">Hi <strong style="color: #FAFAF7;">${name}</strong>,</p>
      <p style="margin: 0 0 20px 0;">Thank you for choosing <strong style="color: #F5B547;">BabahAlgo</strong>. Your <strong>${tierDisplay}</strong> account is being prepared by our team.</p>
      <div style="margin: 24px 0; padding: 20px 24px; background: rgba(255,255,255,0.03); border-radius: 10px; border: 1px solid rgba(245,245,247,0.05);">
        <div style="font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #F5B547; font-weight: 700; margin-bottom: 14px;">Next Steps</div>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${steps.map((step, i) => `
          <tr>
            <td style="vertical-align: top; padding: 0 12px 10px 0; width: 24px;">
              <div style="width: 22px; height: 22px; border-radius: 50%; background: rgba(245,181,71,0.12); color: #F5B547; font-size: 11px; font-weight: 700; text-align: center; line-height: 22px;">${i + 1}</div>
            </td>
            <td style="vertical-align: top; padding: 2px 0 10px 0; font-size: 14px; line-height: 1.55; color: rgba(250,250,247,0.82);">${step}</td>
          </tr>`).join('')}
        </table>
      </div>
      <p style="margin: 0; font-size: 13px; color: rgba(250,250,247,0.55);">Your capital stays in your own broker/exchange account — we are a zero-custody software vendor.</p>`
    : `
      <p style="margin: 0 0 16px 0;">Halo <strong style="color: #FAFAF7;">${name}</strong>,</p>
      <p style="margin: 0 0 20px 0;">Terima kasih telah memilih <strong style="color: #F5B547;">BabahAlgo</strong>. Akun <strong>${tierDisplay}</strong> Anda sedang disiapkan oleh tim kami.</p>
      <div style="margin: 24px 0; padding: 20px 24px; background: rgba(255,255,255,0.03); border-radius: 10px; border: 1px solid rgba(245,245,247,0.05);">
        <div style="font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #F5B547; font-weight: 700; margin-bottom: 14px;">Langkah Selanjutnya</div>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${steps.map((step, i) => `
          <tr>
            <td style="vertical-align: top; padding: 0 12px 10px 0; width: 24px;">
              <div style="width: 22px; height: 22px; border-radius: 50%; background: rgba(245,181,71,0.12); color: #F5B547; font-size: 11px; font-weight: 700; text-align: center; line-height: 22px;">${i + 1}</div>
            </td>
            <td style="vertical-align: top; padding: 2px 0 10px 0; font-size: 14px; line-height: 1.55; color: rgba(250,250,247,0.82);">${step}</td>
          </tr>`).join('')}
        </table>
      </div>
      <p style="margin: 0; font-size: 13px; color: rgba(250,250,247,0.55);">Modal tetap di akun broker/exchange Anda — kami software vendor zero-custody.</p>`;

  const html = renderEmailShell({
    locale,
    subject,
    preheader: isEn
      ? `Your ${tierDisplay} account is being set up. Here's what to do next.`
      : `Akun ${tierDisplay} Anda sedang disiapkan. Ini langkah selanjutnya.`,
    eyebrow: isEn ? 'Welcome' : 'Selamat Datang',
    title: isEn ? `Welcome aboard, ${name}` : `Selamat datang, ${name}`,
    bodyHtml,
    cta: {
      label: isEn ? 'Open Portal' : 'Buka Portal',
      href: `${APP_URL}${portalPath}`,
    },
  });

  return { subject, html };
}
