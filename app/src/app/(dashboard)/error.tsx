"use client"

import { CircleAlert, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <Card className="surface-panel">
      <CardContent className="grid min-h-72 place-items-center text-center">
        <div>
          <CircleAlert className="mx-auto mb-3 size-9 text-destructive" />
          <h2 className="text-lg font-semibold">页面加载失败</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {error.message || "发生了未知错误，请稍后重试。"}
          </p>
          <Button variant="outline" className="mt-4" onClick={reset}>
            <RotateCcw />
            重新加载
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
