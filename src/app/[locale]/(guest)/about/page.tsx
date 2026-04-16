import { getPageMetadata } from '@/lib/seo';
import { getTranslations } from 'next-intl/server';
import { GuestNav } from '@/components/layout/guest-nav';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('about');
  return getPageMetadata('/about', {
    title: `${t('title')} — BabahAlgo`,
    description: 'Learn about BabahAlgo and our mission to democratize institutional-grade trading',
  });
}

export default async function AboutPage() {
  const t = await getTranslations('about');

  return (
    <div className="min-h-screen bg-background">
      <GuestNav activePath="/about" />
      <main className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold mb-8">{t('title')}</h1>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-lg">
            BabahAlgo is an AI-powered quantitative trading platform that brings institutional-grade algorithmic trading
            to individual traders and small funds. Founded with the mission of democratizing access to sophisticated
            trading technology, we combine cutting-edge machine learning with robust risk management.
          </p>

          <h2 className="text-2xl font-semibold text-foreground mt-12">Our Mission</h2>
          <p>
            We believe that access to intelligent trading systems should not be limited to hedge funds and large
            institutions. BabahAlgo levels the playing field by providing AI-driven signals, managed accounts,
            and dedicated infrastructure at accessible price points.
          </p>

          <h2 className="text-2xl font-semibold text-foreground mt-12">Technology</h2>
          <p>
            Our platform leverages an ensemble of machine learning models — including LSTM networks, Transformer
            architectures, and gradient-boosted decision trees — trained on years of tick-level market data. The
            system operates 24/5 with sub-millisecond execution through direct MT5 integration.
          </p>

          <h2 className="text-2xl font-semibold text-foreground mt-12">Infrastructure</h2>
          <p>
            Built on a zero-trust architecture with Cloudflare Tunnel protection, our infrastructure ensures
            99.9% uptime with hardware-level isolation, automated failover, and comprehensive monitoring.
            Every trade execution is logged, audited, and available for review.
          </p>

          <h2 className="text-2xl font-semibold text-foreground mt-12">Contact</h2>
          <p>
            For enterprise inquiries, partnerships, or support, reach us at{' '}
            <a href="mailto:hello@babahalgo.com" className="text-primary hover:underline">hello@babahalgo.com</a>
          </p>
        </div>
      </main>
    </div>
  );
}
