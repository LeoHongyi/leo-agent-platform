"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ListParams } from "@/lib/api/client"

export function TablePagination({
  params,
  total,
  preservedParams,
}: {
  params: ListParams
  total: number
  preservedParams?: Record<string, string>
}) {
  const pathname = usePathname()
  const router = useRouter()
  const pageCount = Math.max(1, Math.ceil(total / params.pageSize))
  const currentPage = Math.min(params.page, pageCount)

  function navigate(page: number, pageSize = params.pageSize) {
    const search = new URLSearchParams(preservedParams)
    search.set("page", String(page))
    search.set("page_size", String(pageSize))
    if (params.search) search.set("search", params.search)
    router.replace(`${pathname}?${search.toString()}`)
  }

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>共 {total} 条记录</span>
      <div className="flex items-center gap-2">
        <Select
          value={String(params.pageSize)}
          onValueChange={(value) => navigate(1, Number(value))}
        >
          <SelectTrigger size="sm" aria-label="每页条数">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 50, 100].map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} 条/页
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="min-w-20 text-center">
          {currentPage} / {pageCount}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={currentPage <= 1}
          onClick={() => navigate(currentPage - 1)}
          aria-label="上一页"
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={currentPage >= pageCount}
          onClick={() => navigate(currentPage + 1)}
          aria-label="下一页"
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
