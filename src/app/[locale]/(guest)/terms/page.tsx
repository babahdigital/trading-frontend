import { getPageMetadata } from '@/lib/seo';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { GuestNav } from '@/components/layout/guest-nav';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('terms');
  return getPageMetadata('/terms', {
    title: `${t('title')} — BabahAlgo`,
    description: 'BabahAlgo Terms of Service and conditions of use',
  });
}

export default async function TermsPage() {
  const t = await getTranslations('terms');

  return (
    <div className="min-h-screen bg-background">
      <GuestNav />
      <main className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold mb-8">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t('last_updated')}: April 17, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>By accessing or using BabahAlgo&apos;s services, you agree to be bound by these Terms of Service. If you do not agree, do not use our services.</p>

          <h2 className="text-xl font-semibold text-foreground">2. Service Description</h2>
          <p>BabahAlgo provides AI-powered trading signals, managed account services (PAMM), and dedicated VPS infrastructure for algorithmic trading. Our services are informational and technological in nature.</p>

          <h2 className="text-xl font-semibold text-foreground">3. Risk Disclosure</h2>
          <p>Trading foreign exchange, CFDs, and other financial instruments involves substantial risk of loss. Past performance is not indicative of future results. You should only trade with capital you can afford to lose. See our <Link href="/risk-disclaimer" className="text-primary hover:underline">Risk Disclaimer</Link> for full details.</p>

          <h2 className="text-xl font-semibold text-foreground">4. Account Responsibilities</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials. You must not share your login details or API keys with unauthorized parties.</p>

          <h2 className="text-xl font-semibold text-foreground">5. Subscription & Billing</h2>
          <p>Subscriptions are billed monthly. You may cancel at any time; cancellation takes effect at the end of the current billing period. Refunds are handled on a case-by-case basis.</p>

          <h2 className="text-xl font-semibold text-foreground">6. Intellectual Property</h2>
          <p>All trading algorithms, models, and platform software are proprietary to BabahAlgo. You may not reverse-engineer, decompile, or redistribute any part of our technology.</p>

          <h2 className="text-xl font-semibold text-foreground">7. Limitation of Liability</h2>
          <p>BabahAlgo shall not be liable for any trading losses, system downtime, or data loss beyond the amount of fees paid in the preceding 3 months.</p>

          <h2 className="text-xl font-semibold text-foreground">8. Modifications</h2>
          <p>We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance.</p>

          <h2 className="text-xl font-semibold text-foreground">9. Contact</h2>
          <p>For questions about these terms, contact <a href="mailto:legal@babahalgo.com" className="text-primary hover:underline">legal@babahalgo.com</a></p>
        </div>
      </main>
    </div>
  );
}
