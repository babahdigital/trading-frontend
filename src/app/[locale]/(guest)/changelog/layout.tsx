import { getPageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  return getPageMetadata(
    '/changelog',
    {
      title: isEn ? 'Changelog — BabahAlgo' : 'Changelog — BabahAlgo',
      description: isEn
        ? 'BabahAlgo platform release notes and updates: new features, fixes, and enhancements.'
        : 'Catatan rilis dan pembaruan platform BabahAlgo: fitur baru, perbaikan, dan peningkatan.',
    },
    locale === 'en' ? 'en' : 'id',
  );
}

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
