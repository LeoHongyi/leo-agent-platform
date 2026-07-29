"use client"

import { useQuery } from "@tanstack/react-query"

import { ListToolbar } from "@/components/common/list-toolbar"
import { PageHeader } from "@/components/common/page-header"
import { TablePagination } from "@/components/common/table-pagination"
import { TableState } from "@/components/common/table-state"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toolsApi } from "@/features/tools/api"
import {
  toolStatusLabels,
  toolTypeLabels,
} from "@/features/tools/constants"
import { DeleteToolDialog } from "@/features/tools/delete-tool-dialog"
import { TestToolDialog } from "@/features/tools/test-tool-dialog"
import { ToolFormDialog } from "@/features/tools/tool-form-dialog"
import { ToolStateButton } from "@/features/tools/tool-state-button"
import type { ListParams } from "@/lib/api/client"
import type { Tool, ToolStatus } from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

const statusClassNames: Record<ToolStatus, string> = {
  enabled:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  disabled: "border-border bg-muted/50 text-muted-foreground",
  error:
    "border-destructive/30 bg-destructive/10 text-destructive",
}

export function ToolsPageClient({ params }: { params: ListParams }) {
  const query = useQuery({
    queryKey: queryKeys.tools.list(params),
    queryFn: () => toolsApi.list(params),
  })
  const items = query.data?.items ?? []

  return (
    <>
      <PageHeader
        title="工具管理"
        description="注册 Agent 工具、维护 Function Calling 定义并验证真实调用"
        action={<ToolFormDialog />}
      />
      <Card className="surface-panel gap-0 py-0">
        <div className="p-4">
          <ListToolbar
            search={params.search}
            placeholder="搜索工具名称或描述"
          />
        </div>
        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>工具</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>调用配置</TableHead>
                <TableHead>近 7 日调用</TableHead>
                <TableHead>成功率</TableHead>
                <TableHead>平均延迟</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableState
                columns={8}
                pending={query.isPending}
                error={query.error}
                empty={!items.length}
                onRetry={() => query.refetch()}
              />
              {items.map((tool) => (
                <TableRow key={tool.id}>
                  <TableCell className="min-w-52">
                    <span className="block font-medium">{tool.name}</span>
                    <span className="block max-w-64 truncate text-xs text-muted-foreground">
                      {tool.description || "暂无描述"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      #{tool.id}
                      {tool.created_by ? ` · ${tool.created_by}` : ""}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {toolTypeLabels[tool.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(statusClassNames[tool.status])}
                    >
                      {toolStatusLabels[tool.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-64">
                    <ToolConfigSummary tool={tool} />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {tool.call_count_7d.toLocaleString("zh-CN")}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {tool.success_rate.toFixed(2)}%
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {tool.avg_latency.toLocaleString("zh-CN")} ms
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-max justify-end gap-1.5">
                      <TestToolDialog tool={tool} />
                      <ToolStateButton tool={tool} />
                      <ToolFormDialog tool={tool} />
                      <DeleteToolDialog tool={tool} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <TablePagination params={params} total={query.data?.total ?? 0} />
      </Card>
    </>
  )
}

function ToolConfigSummary({ tool }: { tool: Tool }) {
  const functionName = tool.function_definition?.name
  const url =
    tool.type === "http_api" && typeof tool.config?.url === "string"
      ? tool.config.url
      : null
  const method =
    tool.type === "http_api" && typeof tool.config?.method === "string"
      ? tool.config.method
      : "POST"

  if (url) {
    return (
      <span className="block min-w-40">
        <span className="font-mono text-xs font-medium">{method}</span>
        <span className="block truncate text-xs text-muted-foreground" title={url}>
          {url}
        </span>
        {functionName ? (
          <span className="block truncate font-mono text-xs text-muted-foreground">
            fn: {functionName}
          </span>
        ) : null}
      </span>
    )
  }

  return (
    <span className="font-mono text-xs text-muted-foreground">
      {functionName ? `fn: ${functionName}` : "—"}
    </span>
  )
}
