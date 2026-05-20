/**
 * Locale-segment loading fallback.
 * Render minimal shell + skeleton hero biar customer tidak lihat blank
 * white screen saat next-intl messages load atau RSC await Prisma fetch.
 */
import { Skeleton } from '@/components/ui/skeleton';

export default function LocaleLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav skeleton */}
      <div className="border-b border-border/60">
        <div className="container-default px-4 sm:px-6 py-4 flex items-center justify-between">
          <Skeleton className="h-7 w-32" />
          <div className="hidden md:flex items-center gap-6">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>

      {/* Hero skeleton */}
      <section className="section-padding">
        <div className="container-default px-4 sm:px-6">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-10 sm:h-14 w-full max-w-2xl mb-3" />
          <Skeleton className="h-10 sm:h-14 w-3/4 max-w-xl mb-6" />
          <Skeleton className="h-4 w-full max-w-2xl mb-2" />
          <Skeleton className="h-4 w-5/6 max-w-2xl mb-2" />
          <Skeleton className="h-4 w-3/4 max-w-xl" />

          <div className="flex flex-wrap gap-3 mt-8">
            <Skeleton className="h-11 w-36 rounded-md" />
            <Skeleton className="h-11 w-32 rounded-md" />
          </div>
        </div>
      </section>
    </div>
  );
}
