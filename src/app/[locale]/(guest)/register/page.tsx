import { Suspense } from 'react';
import { prisma } from '@/lib/db/prisma';
import { getPageMetadata } from '@/lib/seo';
import { createLogger } from '@/lib/logger';
import { RegisterOrchestrator } from '@/components/register/register-orchestrator';
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

interface PackageData {
  slug: string;
  name: string;
  price: string;
  subtitle: string | null;
  features: unknown;
  note: string | null;
  ctaLabel: string;
  ctaLink: string;
}

export default async function RegisterPage() {
  let packages: PackageData[] = [];

  try {
    const tiers = await prisma.pricingTier.findMany({ where: { isVisible: true }, orderBy: { sortOrder: 'asc' } });
    packages = tiers.map((t) => ({
      slug: t.slug,
      name: t.name,
      price: t.price,
      subtitle: t.subtitle,
      features: t.features,
      note: t.note,
      ctaLabel: t.ctaLabel,
      ctaLink: t.ctaLink,
    }));
  } catch (err) {
    log.warn(`Pricing tiers fetch failed, using fallback: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground">
          <EnterpriseNav />
          <main id="main-content" className="container-default px-4 sm:px-6 py-20" />
          <EnterpriseFooter />
        </div>
      }
    >
      <RegisterOrchestrator packages={packages} />
    </Suspense>
  );
}
