import { SkeletonCard, SkeletonChart, SkeletonTable } from '@/components/ui/skeleton';

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <SkeletonChart />
        <SkeletonChart />
      </div>
      <SkeletonTable rows={5} />
    </div>
  );
}
