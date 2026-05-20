/**
 * Register route loading fallback.
 * Pak directive: customer onboarding harus polished — saat
 * /register page server-fetch PricingTier dari DB, render skeleton
 * yang match akhir layout (picker 4 cards) supaya tidak ada jank.
 */
import { Skeleton } from '@/components/ui/skeleton';

export default function RegisterLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/60">
        <div className="container-default px-4 sm:px-6 py-4 flex items-center justify-between">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>

      <section className="section-padding border-b border-border/60">
        <div className="container-default px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <Skeleton className="h-4 w-32 mb-4" />
            <Skeleton className="h-10 sm:h-12 w-3/4 max-w-xl mb-3" />
            <Skeleton className="h-4 w-full max-w-2xl mb-2" />
            <Skeleton className="h-4 w-2/3 max-w-xl mb-10" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border/60 bg-card p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <Skeleton className="w-11 h-11 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                  <div className="mb-4 pb-4 border-b border-border/60 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="space-y-2 mb-4">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-4/6" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
