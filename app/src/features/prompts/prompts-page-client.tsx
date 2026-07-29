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
import { DeletePromptDialog } from "@/features/prompts/delete-prompt-dialog"
import { PromptFormDialog } from "@/features/prompts/prompt-form-dialog"
import { PromptVersionsDialog } from "@/features/prompts/prompt-versions-dialog"
import { promptsApi } from "@/features/prompts/api"
import { promptStatusLabels } from "@/features/prompts/constants"
import { PublishPromptDialog } from "@/features/prompts/publish-prompt-dialog"
import type { ListParams } from "@/lib/api/client"
import type {
  Prompt,
  PromptStatus,
} from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

const statusClassNames: Record<PromptStatus, string> = {
  draft:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  published:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
}

function promptStatusLabel(prompt: Prompt) {
  if (prompt.status === "draft" && prompt.current_version_id) {
    return "有未发布修改"
  }
  return promptStatusLabels[prompt.status]
}

export function PromptsPageClient({ params }: { params: ListParams }) {
  const query = useQuery({
    queryKey: queryKeys.prompts.list(params),
    queryFn: () => promptsApi.list(params),
  })
  const items = query.data?.items ?? []

  return (
    <>
      <PageHeader
        title="Prompt 管理"
        description="维护 Prompt 草稿、变量定义、发布版本和回滚历史"
        action={<PromptFormDialog />}
      />

      <Card className="surface-panel gap-0 py-0">
        <div className="p-4">
          <ListToolbar
            search={params.search}
            placeholder="搜索 Prompt 名称或分类"
          />
        </div>

        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prompt</TableHead>
                <TableHead>分类与标签</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>内容预览</TableHead>
                <TableHead>变量</TableHead>
                <TableHead>创建者</TableHead>
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

              {items.map((prompt) => (
                <TableRow key={prompt.id}>
                  <TableCell className="min-w-48">
                    <span className="block font-medium">{prompt.name}</span>
                    <span className="mt-0.5 block max-w-64 truncate text-xs text-muted-foreground">
                      {prompt.description || "暂无描述"}
                    </span>
                  </TableCell>
                  <TableCell className="min-w-40">
                    <span className="mb-1.5 block text-sm">
                      {prompt.category}
                    </span>
                    <div className="flex max-w-56 flex-wrap gap-1">
                      {prompt.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                      {prompt.tags.length > 3 ? (
                        <Badge variant="outline">
                          +{prompt.tags.length - 3}
                        </Badge>
                      ) : null}
                      {prompt.tags.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-36">
                    <Badge
                      variant="outline"
                      className={cn(statusClassNames[prompt.status])}
                    >
                      {promptStatusLabel(prompt)}
                    </Badge>
                    <span className="mt-1.5 block font-mono text-xs text-muted-foreground">
                      {prompt.version || "未发布"}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-80">
                    <span
                      title={prompt.content}
                      className="block truncate font-mono text-xs text-muted-foreground"
                    >
                      {prompt.content.replace(/\s+/g, " ")}
                    </span>
                  </TableCell>
                  <TableCell className="min-w-32">
                    <span className="text-sm">
                      {prompt.variables.length} 个
                    </span>
                    {prompt.variables.length ? (
                      <span className="mt-0.5 block max-w-44 truncate font-mono text-xs text-muted-foreground">
                        {prompt.variables
                          .slice(0, 3)
                          .map((variable) => variable.name)
                          .join(", ")}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {prompt.created_by || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-max justify-end gap-1.5">
                      <PromptVersionsDialog prompt={prompt} />
                      <PromptFormDialog prompt={prompt} />
                      <PublishPromptDialog prompt={prompt} />
                      <DeletePromptDialog prompt={prompt} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <TablePagination
          params={params}
          total={query.data?.total ?? 0}
        />
      </Card>
    </>
  )
}
