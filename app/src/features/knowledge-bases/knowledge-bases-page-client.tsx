"use client"

import { useQuery } from "@tanstack/react-query"
import { ArrowRight, FileText, Layers3 } from "lucide-react"
import Link from "next/link"

import { ListToolbar } from "@/components/common/list-toolbar"
import { PageHeader } from "@/components/common/page-header"
import { TablePagination } from "@/components/common/table-pagination"
import { TableState } from "@/components/common/table-state"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DeleteKnowledgeBaseDialog } from "@/features/knowledge-bases/delete-knowledge-base-dialog"
import { knowledgeBasesApi } from "@/features/knowledge-bases/api"
import {
  chunkMethodOptions,
  knowledgeBaseStatusLabels,
  retrievalStrategyOptions,
} from "@/features/knowledge-bases/constants"
import { KnowledgeBaseFormDialog } from "@/features/knowledge-bases/knowledge-base-form-dialog"
import type { ListParams } from "@/lib/api/client"
import type { KnowledgeBaseStatus } from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

const statusClassNames: Record<KnowledgeBaseStatus, string> = {
  empty: "border-border bg-muted/50 text-muted-foreground",
  indexing:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  ready:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
}

export function KnowledgeBasesPageClient({ params }: { params: ListParams }) {
  const query = useQuery({
    queryKey: queryKeys.knowledgeBases.list(params),
    queryFn: () => knowledgeBasesApi.list(params),
  })
  const items = query.data?.items ?? []

  return (
    <>
      <PageHeader
        title="知识库管理"
        description="统一管理文档、分段策略和检索效果"
        action={<KnowledgeBaseFormDialog />}
      />
      <Card className="surface-panel gap-0 py-0">
        <div className="p-4">
          <ListToolbar
            search={params.search}
            placeholder="搜索知识库名称或描述"
          />
        </div>
        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>知识库</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>内容规模</TableHead>
                <TableHead>分段配置</TableHead>
                <TableHead>检索配置</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableState
                columns={6}
                pending={query.isPending}
                error={query.error}
                empty={!items.length}
                onRetry={() => query.refetch()}
              />
              {items.map((knowledgeBase) => (
                <TableRow key={knowledgeBase.id}>
                  <TableCell className="min-w-56">
                    <span className="block font-medium">{knowledgeBase.name}</span>
                    <span className="block max-w-72 truncate text-xs text-muted-foreground">
                      {knowledgeBase.description || "暂无描述"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      #{knowledgeBase.id} · {knowledgeBase.embedding_model}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(statusClassNames[knowledgeBase.status])}
                    >
                      {knowledgeBaseStatusLabels[knowledgeBase.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="grid min-w-32 gap-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <FileText className="size-3.5" />
                        {knowledgeBase.document_count} 份文档
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Layers3 className="size-3.5" />
                        {knowledgeBase.segment_count} 个分段
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-40 text-xs">
                    <span className="block">
                      {chunkMethodOptions.find(
                        (item) => item.value === knowledgeBase.chunk_method,
                      )?.label ?? knowledgeBase.chunk_method}
                    </span>
                    <span className="text-muted-foreground">
                      {knowledgeBase.chunk_size} tokens · 重叠 {knowledgeBase.chunk_overlap}
                    </span>
                  </TableCell>
                  <TableCell className="min-w-44 text-xs">
                    <span className="block">
                      {retrievalStrategyOptions.find(
                        (item) => item.value === knowledgeBase.retrieval_strategy,
                      )?.label ?? knowledgeBase.retrieval_strategy}
                    </span>
                    <span className="text-muted-foreground">
                      Top {knowledgeBase.top_k} · 阈值 {knowledgeBase.similarity_threshold}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-max justify-end gap-1.5">
                      <KnowledgeBaseFormDialog
                        knowledgeBase={knowledgeBase}
                        triggerVariant="icon"
                      />
                      <DeleteKnowledgeBaseDialog knowledgeBase={knowledgeBase} />
                      <Link
                        href={`/knowledge-bases/${knowledgeBase.id}`}
                        className={buttonVariants({ size: "sm" })}
                      >
                        管理 <ArrowRight />
                      </Link>
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
