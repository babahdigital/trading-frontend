import { getPageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  return getPageMetadata(
    '/legal/risk-disclosure',
    {
      title: isEn ? 'Risk Disclosure — BabahAlgo' : 'Pengungkapan Risiko — BabahAlgo',
      description: isEn
        ? 'Derivatives trading risk disclosure: leverage, market volatility, and investor responsibility at BabahAlgo.'
        : 'Pengungkapan risiko trading derivatif: leverage, volatilitas pasar, dan tanggung jawab investor di BabahAlgo.',
    },
    locale === 'en' ? 'en' : 'id',
  );
}

export default function RiskDisclosureLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
