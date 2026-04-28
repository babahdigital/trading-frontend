import { getPageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  return getPageMetadata(
    '/legal/regulatory',
    {
      title: isEn ? 'Regulatory Disclosure — BabahAlgo' : 'Pengungkapan Regulasi — BabahAlgo',
      description: isEn
        ? 'Regulatory disclosure, partner broker licenses, and BabahAlgo compliance posture.'
        : 'Pengungkapan regulasi, lisensi broker partner, dan kepatuhan compliance BabahAlgo.',
    },
    locale === 'en' ? 'en' : 'id',
  );
}

export default function RegulatoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
