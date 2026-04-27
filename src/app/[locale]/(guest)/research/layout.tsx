import { getPageMetadata } from '@/lib/seo';
import { breadcrumbSchema, ldJson, organizationSchema, websiteSchema } from '@/lib/seo-jsonld';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  return getPageMetadata(
    '/research',
    {
      title: 'Research & Insights — BabahAlgo Quantitative Analysis',
      description: isEn
        ? 'Quantitative trading research: SMC order block analysis, Wyckoff phase detection, market regime studies, and institutional-grade pair briefs. Updated weekly.'
        : 'Riset trading kuantitatif: SMC order block analysis, Wyckoff phase detection, market regime studies, dan pair brief institutional-grade. Update mingguan.',
    },
    locale === 'en' ? 'en' : 'id',
  );
}

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Research', url: '/research' },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(websiteSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      {children}
    </>
  );
}
