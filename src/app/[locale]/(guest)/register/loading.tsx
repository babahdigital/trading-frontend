/**
 * Register route loading fallback — match new orchestrator layout:
 * demo banner + trust strip + 4-card grid skeleton.
 */
import { Skeleton } from '@/components/ui/skeleton';

export default function RegisterLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/60">
        <div className="layout-container py-4 flex items-center justify-between">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>

      <section className="section-padding border-b border-border/60">
        <div className="layout-container">
          {/* Hero copy */}
          <div className="max-w-3xl mb-10 space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 sm:h-12 w-3/4 max-w-xl" />
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-4 w-2/3 max-w-xl" />
          </div>

          {/* Demo banner */}
          <Skeleton className="h-28 w-full rounded-2xl mb-8" />

          {/* Trust strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>

          {/* 4-card grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/60 bg-card p-6 space-y-4">
                <Skeleton className="w-11 h-11 rounded-lg" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <div className="pb-4 border-b border-border/60 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-28" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-4/6" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
