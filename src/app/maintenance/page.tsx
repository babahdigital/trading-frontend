import { cookies, headers } from 'next/headers';
import { Wrench } from 'lucide-react';
import { BrandLogo } from '@/components/layout/brand-logo';
import { getMaintenanceState } from '@/lib/maintenance';

/**
 * Maintenance page — shown when the platform is under scheduled maintenance.
 * Standalone: no nav, no footer, no layout chrome.
 *
 * Reads dynamic message + ETA from SiteSetting (maintenance_mode) via
 * server-side Prisma. Falls back to default copy if DB is unreachable.
 * Locale detection mirrors root not-found.tsx pattern.
 */
async function detectLocale(): Promise<'id' | 'en'> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  if (cookieLocale === 'en' || cookieLocale === 'id') return cookieLocale;

  const headerStore = await headers();
  const acceptLang = headerStore.get('accept-language') ?? '';
  const langs = acceptLang.split(',').map((s) => s.split(';')[0].trim().toLowerCase());
  const primary = langs[0] ?? '';
  if (primary.startsWith('id')) return 'id';
  if (primary.startsWith('en')) return 'en';
  return 'id';
}

const COPY = {
  id: {
    title: 'Sistem Sedang dalam Pemeliharaan',
    body: 'Tim kami sedang melakukan pemeliharaan terjadwal untuk meningkatkan performa dan keamanan platform. Seluruh layanan akan segera kembali tersedia.',
    check_back: 'Silakan kembali beberapa saat lagi.',
    eta_label: 'Estimasi selesai',
    logo_alt: 'BabahAlgo',
    code_subtitle: 'Scheduled maintenance',
  },
  en: {
    title: 'System Under Maintenance',
    body: 'Our team is performing scheduled maintenance to improve platform performance and security. All services will be available again shortly.',
    check_back: 'Please check back soon.',
    eta_label: 'Estimated completion',
    logo_alt: 'BabahAlgo',
    code_subtitle: 'Scheduled maintenance',
  },
};

// Force dynamic rendering — maintenance page must always reflect current DB state
export const dynamic = 'force-dynamic';

export default async function MaintenancePage() {
  const locale = await detectLocale();
  const copy = COPY[locale];

  // Read maintenance state from DB (server component — Prisma OK here)
  let customMessage: string | null = null;
  let eta: string | null = null;

  try {
    const state = await getMaintenanceState();
    if (state.message) customMessage = state.message;
    if (state.estimatedEnd) eta = state.estimatedEnd;
  } catch {
    // DB unreachable — use defaults
  }

  // Fallback: environment variable (legacy compat)
  if (!eta) eta = process.env.MAINTENANCE_ETA ?? null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center bg-background">
      <div className="mb-12 opacity-90">
        <BrandLogo height={32} priority alt={copy.logo_alt} />
      </div>

      <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 mb-6">
        <Wrench className="h-9 w-9 text-amber-400" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">{copy.title}</h1>

      {customMessage ? (
        <p className="text-muted-foreground max-w-md leading-relaxed mb-4">
          {customMessage}
        </p>
      ) : (
        <p className="text-muted-foreground max-w-md leading-relaxed mb-4">
          {copy.body}
        </p>
      )}

      {eta && (
        <div className="card-enterprise px-6 py-4 mb-6 max-w-sm mx-auto">
          <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-1">
            {copy.eta_label}
          </p>
          <p className="text-lg font-semibold text-amber-400 font-mono">
            {eta}
          </p>
        </div>
      )}

      <p className="text-sm text-muted-foreground/70 mb-8">
        {copy.check_back}
      </p>

      <a
        href="mailto:support@babahalgo.com"
        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md border border-white/15 text-sm font-medium hover:bg-accent hover:border-amber-500/30 transition-colors"
      >
        {locale === 'en' ? 'Contact Support' : 'Hubungi Support'}
      </a>

      <p className="text-xs text-muted-foreground/60 mt-12 font-mono uppercase tracking-wider">
        503 &middot; {copy.code_subtitle}
      </p>
    </div>
  );
}
