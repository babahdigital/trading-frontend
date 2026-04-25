import { getPageMetadata } from '@/lib/seo';
import { breadcrumbSchema, ldJson, organizationSchema } from '@/lib/seo-jsonld';

export async function generateMetadata() {
  return getPageMetadata('/performance', {
    title: 'Track Record Terverifikasi — BabahAlgo Performance',
    description:
      'Live equity curve, win rate, profit factor, max drawdown, dan Sharpe ratio dari production trading account. Updated tiap 4 jam.',
  });
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
