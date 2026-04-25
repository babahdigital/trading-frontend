/**
 * Structured-data (JSON-LD) builders untuk halaman publik.
 * Gunakan via <script type="application/ld+json"> di server component.
 */

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface FinancialProductSchema {
  name: string;
  description: string;
  price?: string;
  currency?: string;
  url: string;
  image?: string;
}

const SITE_BASE = 'https://babahalgo.com';

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'BabahAlgo',
    legalName: 'CV Babah Digital',
    url: SITE_BASE,
    logo: `${SITE_BASE}/logo/babahalgo-icon-256.png`,
    description: 'Quantitative trading infrastructure: Forex SMC/Wyckoff signals + Binance Futures crypto bot, institutional-grade.',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'ID',
    },
    contactPoint: [
      { '@type': 'ContactPoint', email: 'hello@babahalgo.com', contactType: 'customer service' },
      { '@type': 'ContactPoint', email: 'ir@babahalgo.com', contactType: 'institutional inquiries' },
      { '@type': 'ContactPoint', email: 'compliance@babahalgo.com', contactType: 'compliance' },
    ],
    sameAs: ['https://t.me/babahalgo'],
  };
}

export function breadcrumbSchema(crumbs: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url.startsWith('http') ? c.url : `${SITE_BASE}${c.url}`,
    })),
  };
}

export function faqPageSchema(items: FaqEntry[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: it.answer,
      },
    })),
  };
}

export function financialProductSchema(p: FinancialProductSchema) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FinancialProduct',
    name: p.name,
    description: p.description,
    url: p.url.startsWith('http') ? p.url : `${SITE_BASE}${p.url}`,
    provider: {
      '@type': 'Organization',
      name: 'BabahAlgo',
      url: SITE_BASE,
    },
    ...(p.price && p.currency
      ? {
          offers: {
            '@type': 'Offer',
            price: p.price,
            priceCurrency: p.currency,
          },
        }
      : {}),
    ...(p.image ? { image: p.image.startsWith('http') ? p.image : `${SITE_BASE}${p.image}` } : {}),
  };
}

export function professionalServiceSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: 'BabahAlgo',
    image: `${SITE_BASE}/logo/babahalgo-icon-256.png`,
    url: SITE_BASE,
    priceRange: '$49 - $499 / month + profit share',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'ID',
    },
    areaServed: { '@type': 'Country', name: 'Indonesia' },
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'BabahAlgo',
    url: SITE_BASE,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_BASE}/research?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Render helper — JSON.stringify with no extra whitespace (production-friendly).
 */
export function ldJson(obj: object): string {
  return JSON.stringify(obj);
}
