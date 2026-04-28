import { getPageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  return getPageMetadata(
    '/platform/instruments',
    {
      title: isEn ? 'Instruments — BabahAlgo' : 'Instrumen — BabahAlgo',
      description: isEn
        ? 'Forex pairs and crypto assets supported by BabahAlgo: MT5 major pairs and top Binance Spot + Futures crypto.'
        : 'Pair forex dan aset crypto yang didukung BabahAlgo: major pairs MT5 dan top crypto Binance Spot + Futures.',
    },
    locale === 'en' ? 'en' : 'id',
  );
}

export default function InstrumentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
