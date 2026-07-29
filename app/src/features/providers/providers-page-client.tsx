"use client"

import { useQuery } from "@tanstack/react-query"
import { ExternalLink } from "lucide-react"

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
import { DeleteProviderDialog } from "@/features/providers/delete-provider-dialog"
import { ProviderFormDialog } from "@/features/providers/provider-form-dialog"
import { providersApi } from "@/features/providers/api"
import {
  providerStatusLabels,
  providerTypeLabels,
} from "@/features/providers/constants"
import { TestProviderButton } from "@/features/providers/test-provider-button"
import type { ListParams } from "@/lib/api/client"
import type { ProviderStatus } from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

const statusClassNames: Record<ProviderStatus, string> = {
  connected:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  disconnected: "border-border bg-muted/50 text-muted-foreground",
  error:
    "border-destructive/30 bg-destructive/10 text-destructive",
}

export function ProvidersPageClient({ params }: { params: ListParams }) {
  const query = useQuery({
    queryKey: queryKeys.providers.list(params),
    queryFn: () => providersApi.list(params),
  })
  const items = query.data?.items ?? []

  return (
    <>
      <PageHeader
        title="模型供应商"
        description="管理模型 API 端点、加密凭据并验证真实连接状态"
        action={<ProviderFormDialog />}
      />
      <Card className="surface-panel gap-0 py-0">
        <div className="p-4">
          <ListToolbar
            search={params.search}
            placeholder="搜索供应商名称或类型"
          />
        </div>
        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead>供应商</TableHead>
                <TableHead>API 地址</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>模型数</TableHead>
                <TableHead>描述</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableState
                columns={7}
                pending={query.isPending}
                error={query.error}
                empty={!items.length}
                onRetry={() => query.refetch()}
              />
              {items.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell className="font-mono text-muted-foreground">
                    {provider.id}
                  </TableCell>
                  <TableCell>
                    <span className="block font-medium">
                      {provider.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {providerTypeLabels[provider.type]}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-72">
                    <a
                      href={provider.endpoint}
                      target="_blank"
                      rel="noreferrer"
                      title={provider.endpoint}
                      className="inline-flex max-w-full items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <span className="truncate">{provider.endpoint}</span>
                      <ExternalLink className="size-3.5 shrink-0" />
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(statusClassNames[provider.status])}
                    >
                      {providerStatusLabels[provider.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {provider.model_count}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-64 truncate text-muted-foreground">
                    {provider.description || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <TestProviderButton provider={provider} />
                      <ProviderFormDialog provider={provider} />
                      <DeleteProviderDialog provider={provider} />
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
