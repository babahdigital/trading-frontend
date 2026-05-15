import type { Metadata } from 'next';
import { getPageMetadata } from '@/lib/seo';
import { FreeSignupClient } from './free-signup-client';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === 'en';
  return getPageMetadata(
    '/register/free',
    {
      title: isEn
        ? 'Free tier signup — BabahAlgo'
        : 'Daftar gratis — BabahAlgo',
      description: isEn
        ? 'Instant free tier — signal view + shadow AI brain. Zero credit card. Capital stays in your broker account.'
        : 'Daftar gratis instan — akses signal view + AI brain mode SHADOW. Tanpa kartu kredit. Modal tetap di akun broker Anda.',
    },
    locale === 'en' ? 'en' : 'id',
  );
}

export default function RegisterFreePage() {
  return <FreeSignupClient />;
}
