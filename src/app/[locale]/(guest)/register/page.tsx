import { Suspense } from 'react';
import { prisma } from '@/lib/db/prisma';
import { getPageMetadata } from '@/lib/seo';
import { createLogger } from '@/lib/logger';
import { RegisterOrchestrator } from '@/components/register/register-orchestrator';
import type { FaqItem } from '@/components/shared/faq-accordion';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';

export const dynamic = 'force-dynamic';

const log = createLogger('app/register/page');

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  return getPageMetadata(
    '/register',
    {
      title: isEn ? 'Register — BabahAlgo' : 'Daftar — BabahAlgo',
      description: isEn
        ? 'Choose your trading package and get started with BabahAlgo. One entry point — pick Robot Meta, Robot Crypto, VPS License, Institutional engagement, or free demo.'
        : 'Pilih paket trading Anda dan mulai onboarding bersama BabahAlgo. Satu pintu masuk — pilih Robot Meta, Robot Crypto, VPS License, engagement Institusional, atau demo gratis.',
    },
    locale === 'en' ? 'en' : 'id',
  );
}

export default async function RegisterPage() {
  let faqs: FaqItem[] = [];

  try {
    const rows = await prisma.faq.findMany({
      where: { isVisible: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take: 6,
      select: {
        id: true,
        question: true,
        question_en: true,
        answer: true,
        answer_en: true,
      },
    });
    faqs = rows;
  } catch (err) {
    log.warn(`Faq fetch failed: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground">
          <EnterpriseNav />
          <main id="main-content" className="layout-container py-20" />
          <EnterpriseFooter />
        </div>
      }
    >
      <RegisterOrchestrator faqs={faqs} />
    </Suspense>
  );
}
