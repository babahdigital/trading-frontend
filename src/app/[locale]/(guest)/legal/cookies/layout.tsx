import { getPageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  return getPageMetadata(
    '/legal/cookies',
    {
      title: isEn ? 'Cookie Policy — BabahAlgo' : 'Kebijakan Cookies — BabahAlgo',
      description: isEn
        ? 'Cookie usage policy at babahalgo.com — compliant with UU PDP and industry-standard practices.'
        : 'Kebijakan penggunaan cookies di babahalgo.com — sesuai UU PDP dan praktik standar industri.',
    },
    locale === 'en' ? 'en' : 'id',
  );
}

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
