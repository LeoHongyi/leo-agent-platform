import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="space-y-5" aria-label="页面加载中">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  )
}
