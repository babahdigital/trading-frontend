import { prisma } from '@/lib/db/prisma';
import { getPageMetadata } from '@/lib/seo';
import { getTranslations } from 'next-intl/server';
import { GuestNav } from '@/components/layout/guest-nav';
import { FaqClient } from './faq-client';
import { localizeFaq } from '@/lib/i18n/localize-cms';

type FaqRow = Parameters<typeof localizeFaq>[0];

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('faq');
  return getPageMetadata('/faq', {
    title: `${t('title')} — BabahAlgo`,
    description: 'Frequently asked questions about BabahAlgo trading platform',
  });
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('faq');
  let faqs: Array<{ id: string; question: string; answer: string; category: string }> = [];

  try {
    const raw = await prisma.faq.findMany({ where: { isVisible: true }, orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] });
    faqs = raw.map((f: FaqRow) => localizeFaq(f, locale));
  } catch {}

  return (
    <div className="min-h-screen bg-background">
      <GuestNav activePath="/faq" />
      <main className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
          <p className="text-lg text-muted-foreground">{t('subtitle')}</p>
        </div>
        <FaqClient faqs={faqs} />
      </main>
    </div>
  );
}
