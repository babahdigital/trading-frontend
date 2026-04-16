'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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

const FALLBACK_PACKAGES: PackageData[] = [
  {
    slug: 'signal', name: 'Signal Subscriber', price: '$49 - $149/bulan', subtitle: 'Terima sinyal trading otomatis ke dashboard Anda.',
    features: ['Dashboard monitoring', 'Sinyal real-time', 'Laporan harian', 'Support via Telegram'],
    note: null, ctaLabel: 'Daftar Sekarang', ctaLink: '/register/signal',
  },
  {
    slug: 'pamm', name: 'PAMM Account', price: '20-30% profit share', subtitle: 'CopyTrade otomatis — dana dikelola oleh bot AI.',
    features: ['CopyTrade otomatis', 'Dashboard monitoring', 'Laporan harian', 'Profit sharing transparan'],
    note: null, ctaLabel: 'Daftar Sekarang', ctaLink: '/register/pamm',
  },
  {
    slug: 'vps', name: 'VPS License', price: '$3,000 - $7,500 setup', subtitle: 'Dedicated VPS dengan full bot access.',
    features: ['VPS dedicated', 'Full bot access', 'Priority support 24/7', 'Custom konfigurasi'],
    note: '+ $150-300/bulan maintenance', ctaLabel: 'Konsultasi', ctaLink: '/register/vps',
  },
];

export function RegisterClient({ packages }: { packages: PackageData[] }) {
  const displayPkgs = packages.length > 0 ? packages : FALLBACK_PACKAGES;

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-primary">BabahAlgo</Link>
          <Link href="/login" className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-accent transition-colors">
            Login
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Pilih Paket yang Sesuai</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tiga model layanan untuk kebutuhan yang berbeda. Mulai dari sinyal trading hingga dedicated VPS.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {displayPkgs.map((pkg) => {
            const features = Array.isArray(pkg.features) ? pkg.features as string[] : [];
            return (
              <Card key={pkg.slug} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{pkg.name}</CardTitle>
                  <CardDescription>{pkg.subtitle}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="text-2xl font-bold text-primary mb-4">{pkg.price}</div>
                  <div className="flex-1 space-y-2 mb-6">
                    {features.map((f) => (
                      <div key={String(f)} className="flex items-center gap-2 text-sm">
                        <span className="text-green-400">&#10003;</span> {String(f)}
                      </div>
                    ))}
                  </div>
                  {pkg.note && <p className="text-xs text-muted-foreground mb-4">* {pkg.note}</p>}
                  <Link
                    href={pkg.ctaLink}
                    className="block text-center px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                  >
                    {pkg.ctaLabel}
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
