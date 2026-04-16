import { SkeletonCard, SkeletonChart, SkeletonTable } from '@/components/ui/skeleton';

export default function PortalDashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
      <SkeletonChart />
      <SkeletonTable rows={5} />
    </div>
  );
}
