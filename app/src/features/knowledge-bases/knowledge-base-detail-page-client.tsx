"use client"

import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, FileText, Layers3, UserRound } from "lucide-react"
import Link from "next/link"

import { PageHeader } from "@/components/common/page-header"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { knowledgeBasesApi } from "@/features/knowledge-bases/api"
import { KnowledgeBaseConfigDialog } from "@/features/knowledge-bases/knowledge-base-config-dialog"
import {
  knowledgeBaseStatusLabels,
  retrievalStrategyOptions,
} from "@/features/knowledge-bases/constants"
import { DocumentsPanel } from "@/features/knowledge-bases/documents-panel"
import { KnowledgeBaseFormDialog } from "@/features/knowledge-bases/knowledge-base-form-dialog"
import { RetrievalTestPanel } from "@/features/knowledge-bases/retrieval-test-panel"
import { SegmentsPanel } from "@/features/knowledge-bases/segments-panel"
import { queryKeys } from "@/lib/query-keys"

export function KnowledgeBaseDetailPageClient({
  knowledgeBaseId,
}: {
  knowledgeBaseId: number
}) {
  const query = useQuery({
    queryKey: queryKeys.knowledgeBases.detail(knowledgeBaseId),
    queryFn: () => knowledgeBasesApi.get(knowledgeBaseId),
  })

  if (query.isPending) {
    return (
      <div className="grid gap-4">
        <div className="h-20 animate-pulse rounded-xl bg-muted" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  if (query.error || !query.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>无法加载知识库</CardTitle>
          <CardDescription>
            {query.error?.message || "知识库不存在或已被删除"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/knowledge-bases" className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft /> 返回知识库
          </Link>
        </CardContent>
      </Card>
    )
  }

  const knowledgeBase = query.data
  const strategyLabel = retrievalStrategyOptions.find(
    (item) => item.value === knowledgeBase.retrieval_strategy,
  )?.label

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/knowledge-bases"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> 返回知识库
        </Link>
        <PageHeader
          title={knowledgeBase.name}
          description={knowledgeBase.description || "管理文档、分段和检索配置"}
          action={
            <div className="flex flex-wrap gap-2">
              <KnowledgeBaseFormDialog knowledgeBase={knowledgeBase} />
              <KnowledgeBaseConfigDialog knowledgeBase={knowledgeBase} />
            </div>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="运行状态"
          value={
            <Badge variant="outline">
              {knowledgeBaseStatusLabels[knowledgeBase.status]}
            </Badge>
          }
          description={`#${knowledgeBase.id} · ${knowledgeBase.embedding_model}`}
        />
        <SummaryCard
          title="文档"
          value={knowledgeBase.document_count.toLocaleString("zh-CN")}
          description={<span className="inline-flex items-center gap-1"><FileText className="size-3.5" /> 已登记文档</span>}
        />
        <SummaryCard
          title="分段"
          value={knowledgeBase.segment_count.toLocaleString("zh-CN")}
          description={<span className="inline-flex items-center gap-1"><Layers3 className="size-3.5" /> {knowledgeBase.chunk_size} / 重叠 {knowledgeBase.chunk_overlap}</span>}
        />
        <SummaryCard
          title="默认检索"
          value={`Top ${knowledgeBase.top_k}`}
          description={`${strategyLabel ?? knowledgeBase.retrieval_strategy} · 阈值 ${knowledgeBase.similarity_threshold}`}
        />
      </div>

      <p className="-mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <UserRound className="size-3.5" />
        创建人 {knowledgeBase.created_by || "未知"} · 最后更新 {formatDate(knowledgeBase.updated_at)}
      </p>

      <DocumentsPanel knowledgeBaseId={knowledgeBaseId} />
      <SegmentsPanel knowledgeBaseId={knowledgeBaseId} />
      <RetrievalTestPanel knowledgeBase={knowledgeBase} />
    </div>
  )
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string
  value: React.ReactNode
  description: React.ReactNode
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{description}</CardContent>
    </Card>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
