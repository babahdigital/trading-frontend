import { getPageMetadata } from '@/lib/seo';
import { breadcrumbSchema, ldJson, organizationSchema } from '@/lib/seo-jsonld';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  return getPageMetadata(
    '/about/team',
    {
      title: isEn
        ? 'Team BabahAlgo — Quantitative Trading Engineering | CV Babah Digital'
        : 'Tim BabahAlgo — Quantitative Trading Engineering | CV Babah Digital',
      description: isEn
        ? 'Lean quant team focused on execution: founder + quant lead, infrastructure & client operations, risk & compliance, customer success. Indonesia.'
        : 'Tim quant kecil yang fokus eksekusi: founder + quant lead, infrastructure & client operations, risk & compliance, customer success. Indonesia.',
    },
    locale === 'en' ? 'en' : 'id',
  );
}

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'About', url: '/about' },
    { name: 'Team', url: '/about/team' },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      {children}
    </>
  );
}
