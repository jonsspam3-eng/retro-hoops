import { CardSkeleton, Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="card space-y-2">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <CardSkeleton rows={6} />
      <CardSkeleton rows={4} />
    </div>
  );
}
