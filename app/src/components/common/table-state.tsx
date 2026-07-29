import { AlertCircle, Database } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  TableCell,
  TableRow,
} from "@/components/ui/table"

export function TableState({
  columns,
  pending,
  error,
  empty,
  onRetry,
}: {
  columns: number
  pending: boolean
  error: Error | null
  empty: boolean
  onRetry: () => void
}) {
  if (pending) {
    return Array.from({ length: 5 }, (_, index) => (
      <TableRow key={index}>
        <TableCell colSpan={columns}>
          <div className="h-8 animate-pulse rounded-md bg-muted" />
        </TableCell>
      </TableRow>
    ))
  }

  if (error) {
    return (
      <TableRow>
        <TableCell colSpan={columns} className="h-48 text-center">
          <AlertCircle className="mx-auto mb-2 size-7 text-destructive" />
          <p className="mb-3 text-sm text-muted-foreground">{error.message}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            重新加载
          </Button>
        </TableCell>
      </TableRow>
    )
  }

  if (empty) {
    return (
      <TableRow>
        <TableCell colSpan={columns} className="h-48 text-center">
          <Database className="mx-auto mb-2 size-7 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">暂无数据</p>
        </TableCell>
      </TableRow>
    )
  }

  return null
}
