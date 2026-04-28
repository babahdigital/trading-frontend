import { getPageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  return getPageMetadata(
    '/status',
    {
      title: isEn ? 'System Status — BabahAlgo' : 'Status Sistem — BabahAlgo',
      description: isEn
        ? 'Real-time status of BabahAlgo services: API, execution, signals, and platform components.'
        : 'Status real-time layanan BabahAlgo: API, eksekusi, sinyal, dan komponen platform.',
    },
    locale === 'en' ? 'en' : 'id',
  );
}

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
