import { getPageMetadata } from '@/lib/seo';
import { breadcrumbSchema, ldJson, organizationSchema, websiteSchema } from '@/lib/seo-jsonld';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  return getPageMetadata(
    '/research',
    {
      title: isEn
        ? 'Research & Insights — BabahAlgo Quantitative Analysis'
        : 'Riset & Wawasan — BabahAlgo Analisis Kuantitatif',
      description: isEn
        ? 'Market research, backtest analysis, and quantitative insights from the BabahAlgo team.'
        : 'Riset pasar, analisis backtest, dan wawasan kuantitatif dari tim BabahAlgo.',
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
