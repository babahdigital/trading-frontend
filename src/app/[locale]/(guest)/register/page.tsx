import { prisma } from '@/lib/db/prisma';
import { getPageMetadata } from '@/lib/seo';
import { createLogger } from '@/lib/logger';
import { RegisterClient } from './register-client';

export const dynamic = 'force-dynamic';

const log = createLogger('app/register/page');

export async function generateMetadata() {
  return getPageMetadata('/register', {
    title: 'Register — BabahAlgo',
    description: 'Choose your trading package and get started with BabahAlgo',
  });
}

export default async function RegisterPage() {
  let packages: Array<{
    slug: string; name: string; price: string; subtitle: string | null;
    features: unknown; note: string | null; ctaLabel: string; ctaLink: string;
  }> = [];

  try {
    const tiers = await prisma.pricingTier.findMany({ where: { isVisible: true }, orderBy: { sortOrder: 'asc' } });
    packages = tiers.map((t) => ({
      slug: t.slug, name: t.name, price: t.price, subtitle: t.subtitle,
      features: t.features, note: t.note, ctaLabel: t.ctaLabel, ctaLink: t.ctaLink,
    }));
  } catch (err) {
    // Falls back to RegisterClient's translated tier definitions when DB read fails
    log.warn(`Pricing tiers fetch failed, using fallback: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  return <RegisterClient packages={packages} />;
}
