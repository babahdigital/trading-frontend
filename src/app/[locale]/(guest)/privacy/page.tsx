import { getPageMetadata } from '@/lib/seo';
import { getTranslations } from 'next-intl/server';
import { GuestNav } from '@/components/layout/guest-nav';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('privacy');
  return getPageMetadata('/privacy', {
    title: `${t('title')} — BabahAlgo`,
    description: 'BabahAlgo Privacy Policy — how we collect, use, and protect your data',
  });
}

export default async function PrivacyPage() {
  const t = await getTranslations('privacy');

  return (
    <div className="min-h-screen bg-background">
      <GuestNav />
      <main className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold mb-8">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t('last_updated')}: April 17, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
          <p>We collect information you provide directly: name, email, phone number, and trading account details. We also collect usage data, IP addresses, and device information automatically.</p>

          <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
          <p>Your data is used to provide and improve our services, process transactions, send notifications, and ensure platform security. We do not sell your personal data to third parties.</p>

          <h2 className="text-xl font-semibold text-foreground">3. Data Storage & Security</h2>
          <p>All data is encrypted at rest and in transit. We use zero-trust architecture with Cloudflare protection, hardware-level isolation, and regular security audits.</p>

          <h2 className="text-xl font-semibold text-foreground">4. Cookies</h2>
          <p>We use essential cookies for authentication and session management. Analytics cookies are used only with your consent to improve user experience.</p>

          <h2 className="text-xl font-semibold text-foreground">5. Third-Party Services</h2>
          <p>We integrate with MetaTrader 5 (trading execution), Telegram (notifications), and Cloudflare (security). Each third party has its own privacy policy.</p>

          <h2 className="text-xl font-semibold text-foreground">6. Data Retention</h2>
          <p>Account data is retained for the duration of your subscription plus 90 days. Trading logs are retained for 2 years for compliance purposes. You may request deletion at any time.</p>

          <h2 className="text-xl font-semibold text-foreground">7. Your Rights</h2>
          <p>You have the right to access, correct, export, or delete your personal data. Contact <a href="mailto:privacy@babahalgo.com" className="text-primary hover:underline">privacy@babahalgo.com</a> to exercise these rights.</p>

          <h2 className="text-xl font-semibold text-foreground">8. Changes</h2>
          <p>We will notify you of significant changes to this policy via email or platform notification at least 30 days before changes take effect.</p>
        </div>
      </main>
    </div>
  );
}
