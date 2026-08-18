"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Download,
  LoaderCircle,
  RefreshCw,
  Search,
  X,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { TableState } from "@/components/common/table-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DeleteDocumentDialog } from "@/features/knowledge-bases/delete-document-dialog"
import { knowledgeBasesApi } from "@/features/knowledge-bases/api"
import {
  documentStatusLabels,
  documentStatusOptions,
} from "@/features/knowledge-bases/constants"
import { KnowledgePagination } from "@/features/knowledge-bases/knowledge-pagination"
import { UploadDocumentDialog } from "@/features/knowledge-bases/upload-document-dialog"
import type { ListParams } from "@/lib/api/client"
import type { DocumentStatus, KnowledgeDocument } from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

type DocumentParams = ListParams & { status?: DocumentStatus }

const statusClassNames: Record<DocumentStatus, string> = {
  pending: "border-border bg-muted/50 text-muted-foreground",
  processing:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  completed:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  failed: "border-destructive/30 bg-destructive/10 text-destructive",
}

export function DocumentsPanel({ knowledgeBaseId }: { knowledgeBaseId: number }) {
  const [params, setParams] = useState<DocumentParams>({
    page: 1,
    pageSize: 10,
    search: "",
  })
  const wasProcessing = useRef(false)
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: queryKeys.knowledgeBases.documentList(knowledgeBaseId, params),
    queryFn: () => knowledgeBasesApi.listDocuments(knowledgeBaseId, params),
    refetchInterval: (currentQuery) =>
      hasActiveDocuments(currentQuery.state.data?.items) ? 2_000 : false,
  })
  const active = hasActiveDocuments(query.data?.items)

  useEffect(() => {
    if (wasProcessing.current && !active) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.knowledgeBases.all,
      })
    }
    wasProcessing.current = active
  }, [active, queryClient])

  function search(formData: FormData) {
    setParams((current) => ({
      ...current,
      page: 1,
      search: String(formData.get("document-search") || "").trim().slice(0, 100),
    }))
  }

  return (
    <Card className="surface-panel gap-0 py-0">
      <CardHeader className="border-b py-4">
        <CardTitle>文档</CardTitle>
        <CardDescription>
          上传原文件、跟踪解析状态并在配置变更后重新处理
        </CardDescription>
        <CardAction>
          <UploadDocumentDialog knowledgeBaseId={knowledgeBaseId} />
        </CardAction>
      </CardHeader>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <form action={search} className="flex min-w-0 flex-1 gap-2 sm:max-w-md">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              key={params.search}
              name="document-search"
              defaultValue={params.search}
              placeholder="搜索文件名"
              className="h-9 pl-9"
            />
          </div>
          <Button type="submit" variant="secondary" className="h-9">搜索</Button>
          {params.search ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9"
              aria-label="清除文档搜索"
              onClick={() => setParams((current) => ({ ...current, page: 1, search: "" }))}
            >
              <X />
            </Button>
          ) : null}
        </form>
        <Select
          value={params.status ?? "all"}
          onValueChange={(value) =>
            setParams((current) => ({
              ...current,
              page: 1,
              status: value === "all" ? undefined : (value as DocumentStatus),
            }))
          }
        >
          <SelectTrigger className="w-full sm:w-40" aria-label="文档状态筛选">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {documentStatusOptions.map((item) => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {active ? (
          <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
            <LoaderCircle className="size-3.5 animate-spin" /> 自动刷新中
          </span>
        ) : null}
      </div>
      <div className="overflow-x-auto border-t">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>文件</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>大小</TableHead>
              <TableHead>内容统计</TableHead>
              <TableHead>上传信息</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableState
              columns={6}
              pending={query.isPending}
              error={query.error}
              empty={!query.data?.items.length}
              onRetry={() => query.refetch()}
            />
            {query.data?.items.map((document) => (
              <DocumentRow
                key={document.id}
                knowledgeBaseId={knowledgeBaseId}
                document={document}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      <KnowledgePagination
        page={params.page}
        pageSize={params.pageSize}
        total={query.data?.total ?? 0}
        onChange={(page, pageSize) =>
          setParams((current) => ({ ...current, page, pageSize }))
        }
      />
    </Card>
  )
}

function DocumentRow({
  knowledgeBaseId,
  document,
}: {
  knowledgeBaseId: number
  document: KnowledgeDocument
}) {
  const [downloading, setDownloading] = useState(false)
  const queryClient = useQueryClient()
  const retryMutation = useMutation({
    mutationFn: () => knowledgeBasesApi.retryDocument(knowledgeBaseId, document.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeBases.all })
      toast.success("文档已重新进入处理队列")
    },
    onError: (error) => toast.error(error.message),
  })

  async function download() {
    setDownloading(true)
    try {
      const result = await knowledgeBasesApi.downloadDocument(
        knowledgeBaseId,
        document.id,
      )
      const url = URL.createObjectURL(result.blob)
      const anchor = window.document.createElement("a")
      anchor.href = url
      anchor.download = result.fileName || document.file_name
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
      toast.success("文档下载已开始")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "文档下载失败")
    } finally {
      setDownloading(false)
    }
  }

  const canRetry = document.status === "failed" || document.status === "completed"

  return (
    <TableRow>
      <TableCell className="min-w-56">
        <span className="block max-w-72 truncate font-medium" title={document.file_name}>
          {document.file_name}
        </span>
        <span className="text-xs uppercase text-muted-foreground">
          {document.file_type} · #{document.id}
        </span>
        {document.error_message ? (
          <span className="block max-w-80 truncate text-xs text-destructive" title={document.error_message}>
            {document.error_message}
          </span>
        ) : null}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn(statusClassNames[document.status])}>
          {documentStatusLabels[document.status]}
        </Badge>
      </TableCell>
      <TableCell className="font-mono text-xs">{document.file_size || "—"}</TableCell>
      <TableCell className="text-xs">
        <span className="block">{document.segment_count} 个分段</span>
        <span className="text-muted-foreground">{document.word_count.toLocaleString("zh-CN")} 字</span>
      </TableCell>
      <TableCell className="min-w-40 text-xs">
        <span className="block">{document.uploaded_by || "未知用户"}</span>
        <span className="text-muted-foreground">{formatDate(document.uploaded_at || document.created_at)}</span>
      </TableCell>
      <TableCell>
        <div className="flex min-w-max justify-end gap-1.5">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={downloading}
            onClick={download}
            aria-label={`下载文档 ${document.file_name}`}
          >
            {downloading ? <LoaderCircle className="animate-spin" /> : <Download />}
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={!canRetry || retryMutation.isPending}
            onClick={() => retryMutation.mutate()}
            aria-label={`重新处理文档 ${document.file_name}`}
          >
            <RefreshCw className={cn(retryMutation.isPending && "animate-spin")} />
          </Button>
          <DeleteDocumentDialog knowledgeBaseId={knowledgeBaseId} document={document} />
        </div>
      </TableCell>
    </TableRow>
  )
}

function hasActiveDocuments(items: KnowledgeDocument[] | undefined) {
  return Boolean(
    items?.some((item) => item.status === "pending" || item.status === "processing"),
  )
}

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}
