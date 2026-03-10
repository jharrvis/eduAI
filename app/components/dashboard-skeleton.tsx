import { Loader2 } from "lucide-react";

export default function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="app-card flex items-center gap-4 p-5">
            <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
            <div className="space-y-2">
              <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-8 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
