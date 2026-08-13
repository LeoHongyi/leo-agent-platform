"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function KnowledgePagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number
  pageSize: number
  total: number
  onChange: (page: number, pageSize: number) => void
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, pageCount)

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>共 {total} 条记录</span>
      <div className="flex items-center gap-2">
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onChange(1, Number(value))}
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
          onClick={() => onChange(currentPage - 1, pageSize)}
          aria-label="上一页"
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={currentPage >= pageCount}
          onClick={() => onChange(currentPage + 1, pageSize)}
          aria-label="下一页"
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
