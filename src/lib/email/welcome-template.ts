/**
 * Bilingual welcome email templates for newly registered customers.
 * Selected by locale detected from registration request (cookie / accept-language).
 */
import type { AppLocale } from '@/lib/i18n/server-locale';

interface WelcomeEmailParams {
  name: string;
  tier: string;
}

interface WelcomeEmailContent {
  subject: string;
  html: string;
}

export function renderWelcomeEmail(locale: AppLocale, params: WelcomeEmailParams): WelcomeEmailContent {
  const { name, tier } = params;
  const tierDisplay = tier.replace(/_/g, ' ');

  if (locale === 'en') {
    return {
      subject: 'Welcome to BabahAlgo',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
        <h2 style="color:#d97706">Welcome, ${name}!</h2>
        <p>Thank you for registering with <strong>BabahAlgo</strong>.</p>
        <p>Selected plan: <strong>${tierDisplay}</strong></p>
        <h3>Next Steps:</h3>
        <ol>
          <li>Wait for account activation by our team (within 24 hours)</li>
          <li>Set up Telegram Bot: open <a href="https://t.me/babahalgo_bot">@babahalgo_bot</a> → type /start → copy your Chat ID</li>
          <li>Paste the Chat ID at <a href="https://babahalgo.com/portal/account">Portal &gt; Settings &gt; Notifications</a></li>
          <li>Once active, trading signals will automatically arrive via Telegram &amp; email</li>
        </ol>
        <p style="margin-top:24px;padding:16px;background:#fef3c7;border-radius:8px">
          <strong>Need help?</strong> Reply to this email or contact us at
          <a href="mailto:hello@babahalgo.com">hello@babahalgo.com</a>
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="font-size:12px;color:#999">
          <em>Disclaimer: Trading involves significant risk. Signals are not investment advice. Make sure you understand the risks before trading.</em>
        </p>
      </div>`,
    };
  }

  // Default: Indonesian
  return {
    subject: 'Selamat Datang di BabahAlgo',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
      <h2 style="color:#d97706">Selamat Datang, ${name}!</h2>
      <p>Terima kasih telah mendaftar di <strong>BabahAlgo</strong>.</p>
      <p>Paket yang dipilih: <strong>${tierDisplay}</strong></p>
      <h3>Langkah Selanjutnya:</h3>
      <ol>
        <li>Tunggu aktivasi akun oleh tim kami (maks 24 jam)</li>
        <li>Setup Telegram Bot: buka <a href="https://t.me/babahalgo_bot">@babahalgo_bot</a> → ketik /start → copy Chat ID</li>
        <li>Paste Chat ID di <a href="https://babahalgo.com/portal/account">Portal &gt; Settings &gt; Notifications</a></li>
        <li>Setelah aktif, sinyal trading akan otomatis masuk ke Telegram &amp; email Anda</li>
      </ol>
      <p style="margin-top:24px;padding:16px;background:#fef3c7;border-radius:8px">
        <strong>Butuh bantuan?</strong> Balas email ini atau hubungi kami di
        <a href="mailto:hello@babahalgo.com">hello@babahalgo.com</a>
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="font-size:12px;color:#999">
        <em>Disclaimer: Trading berisiko tinggi. Sinyal bukan saran investasi. Pastikan memahami risiko sebelum trading.</em>
      </p>
    </div>`,
  };
}
