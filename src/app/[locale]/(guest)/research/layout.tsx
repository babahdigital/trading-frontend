import { getPageMetadata } from '@/lib/seo';
import { breadcrumbSchema, ldJson, organizationSchema, websiteSchema } from '@/lib/seo-jsonld';

export async function generateMetadata() {
  return getPageMetadata('/research', {
    title: 'Research & Insights — BabahAlgo Quantitative Analysis',
    description:
      'Riset trading kuantitatif: SMC order block analysis, Wyckoff phase detection, market regime studies, dan pair brief institutional-grade. Update mingguan.',
  });
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
