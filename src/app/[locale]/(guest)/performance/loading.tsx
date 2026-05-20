/**
 * Performance route loading fallback.
 * Match final layout: hero + equity badge + chart card + KPI grid.
 */
import { Skeleton } from '@/components/ui/skeleton';

export default function PerformanceLoading() {
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
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-10 sm:h-14 w-full max-w-2xl mb-3" />
          <Skeleton className="h-10 sm:h-14 w-2/3 max-w-xl mb-6" />
          <Skeleton className="h-4 w-full max-w-2xl mb-8" />
          {/* Equity badge */}
          <div className="inline-flex items-center gap-4 rounded-lg border border-border/60 bg-card/60 px-5 py-3 mb-8">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-28" />
          </div>
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-11 w-36 rounded-md" />
            <Skeleton className="h-11 w-32 rounded-md" />
          </div>
        </div>
      </section>

      <section className="section-padding border-b border-border/60">
        <div className="container-default px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-6">
            <Skeleton className="h-[420px] w-full" />
          </div>
        </div>
      </section>
    </div>
  );
}
