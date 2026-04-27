import { getPageMetadata } from '@/lib/seo';
import { breadcrumbSchema, ldJson, organizationSchema } from '@/lib/seo-jsonld';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  return getPageMetadata(
    '/performance',
    {
      title: isEn
        ? 'Verified Track Record — BabahAlgo Performance'
        : 'Track Record Terverifikasi — BabahAlgo Performance',
      description: isEn
        ? 'Live equity curve, win rate, profit factor, max drawdown, and Sharpe ratio from a production trading account. Refreshed every 4 hours.'
        : 'Live equity curve, win rate, profit factor, max drawdown, dan Sharpe ratio dari production trading account. Updated tiap 4 jam.',
    },
    locale === 'en' ? 'en' : 'id',
  );
}

export default function PerformanceLayout({ children }: { children: React.ReactNode }) {
  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Performance', url: '/performance' },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      {children}
    </>
  );
}
