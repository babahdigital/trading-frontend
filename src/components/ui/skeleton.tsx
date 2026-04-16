import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted/50', className)}
      {...props}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border p-6 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="rounded-lg border p-4">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-[280px] md:h-[320px] w-full" />
    </div>
  );
}

function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border">
      <Skeleton className="h-10 w-full rounded-t-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-t">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonChart, SkeletonTable };
