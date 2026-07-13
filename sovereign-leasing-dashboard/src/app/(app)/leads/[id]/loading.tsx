import { CardSkeleton, Skeleton } from "@/components/skeleton";

export default function LeadDetailLoading() {
  return (
    <div className="space-y-4">
      <div className="card flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
      <CardSkeleton rows={3} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <CardSkeleton rows={6} />
          <CardSkeleton rows={3} />
        </div>
        <div className="space-y-4">
          <CardSkeleton rows={4} />
          <CardSkeleton rows={5} />
        </div>
      </div>
    </div>
  );
}
