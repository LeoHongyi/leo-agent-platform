"use client"

import { useQuery } from "@tanstack/react-query"
import { Plus, Star } from "lucide-react"

import { ListToolbar } from "@/components/common/list-toolbar"
import { PageHeader } from "@/components/common/page-header"
import { TablePagination } from "@/components/common/table-pagination"
import { TableState } from "@/components/common/table-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DeleteModelDialog } from "@/features/models/delete-model-dialog"
import { ModelFormDialog } from "@/features/models/model-form-dialog"
import { ModelProviderFilter } from "@/features/models/model-provider-filter"
import { modelsApi } from "@/features/models/api"
import { modelStatusLabels } from "@/features/models/constants"
import { providersApi } from "@/features/providers/api"
import type { ModelListParams } from "@/lib/api/client"
import type { ModelStatus } from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

const providerListParams = { page: 1, pageSize: 100, search: "" }
const priceFormatter = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 6,
})
const statusClassNames: Record<ModelStatus, string> = {
  available:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  unavailable: "border-border bg-muted/50 text-muted-foreground",
  rate_limited:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
}

export function ModelsPageClient({
  params,
}: {
  params: ModelListParams
}) {
  const modelsQuery = useQuery({
    queryKey: queryKeys.models.list(params),
    queryFn: () => modelsApi.list(params),
  })
  const providersQuery = useQuery({
    queryKey: queryKeys.providers.list(providerListParams),
    queryFn: () => providersApi.list(providerListParams),
  })
  const items = modelsQuery.data?.items ?? []
  const providers = providersQuery.data?.items ?? []
  const preservedParams = params.providerId
    ? { provider_id: String(params.providerId) }
    : undefined

  return (
    <>
      <PageHeader
        title="模型管理"
        description="管理供应商模型、能力、上下文窗口和调用价格"
        action={
          providersQuery.isPending ? (
            <Button disabled>
              <Plus />
              添加模型
            </Button>
          ) : (
            <ModelFormDialog providers={providers} />
          )
        }
      />
      <Card className="surface-panel gap-0 py-0">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <ListToolbar
            search={params.search}
            placeholder="搜索模型名称或模型标识"
            preservedParams={preservedParams}
          />
          <ModelProviderFilter
            providers={providers}
            providerId={params.providerId}
          />
        </div>
        {!providersQuery.isPending && providers.length === 0 ? (
          <div className="border-t bg-amber-500/5 px-4 py-2 text-sm text-amber-700 dark:text-amber-300">
            请先在“模型供应商”中创建供应商，再添加模型。
          </div>
        ) : null}
        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>模型</TableHead>
                <TableHead>供应商</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>能力</TableHead>
                <TableHead>上下文</TableHead>
                <TableHead>价格 / 1K tokens</TableHead>
                <TableHead>默认</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableState
                columns={8}
                pending={modelsQuery.isPending}
                error={modelsQuery.error}
                empty={!items.length}
                onRetry={() => modelsQuery.refetch()}
              />
              {items.map((model) => (
                <TableRow key={model.id}>
                  <TableCell>
                    <span className="block font-medium">{model.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {model.model_id}
                    </span>
                  </TableCell>
                  <TableCell>{model.provider_name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(statusClassNames[model.status])}
                    >
                      {modelStatusLabels[model.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-60 flex-wrap gap-1">
                      {model.capabilities.slice(0, 3).map((capability) => (
                        <Badge key={capability} variant="secondary">
                          {capability}
                        </Badge>
                      ))}
                      {model.capabilities.length > 3 ? (
                        <Badge variant="outline">
                          +{model.capabilities.length - 3}
                        </Badge>
                      ) : null}
                      {model.capabilities.length === 0 ? "—" : null}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {model.context_length.toLocaleString("zh-CN")}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    <span className="block">
                      输入 {priceFormatter.format(model.input_price)}
                    </span>
                    <span className="block">
                      输出 {priceFormatter.format(model.output_price)}{" "}
                      {model.currency}
                    </span>
                  </TableCell>
                  <TableCell>
                    {model.is_default ? (
                      <Badge className="gap-1">
                        <Star className="fill-current" />
                        默认
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <ModelFormDialog
                        model={model}
                        providers={providers}
                      />
                      <DeleteModelDialog model={model} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <TablePagination
          params={params}
          total={modelsQuery.data?.total ?? 0}
          preservedParams={preservedParams}
        />
      </Card>
    </>
  )
}
