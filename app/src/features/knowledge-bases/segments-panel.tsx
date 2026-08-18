"use client"

import { useQuery } from "@tanstack/react-query"
import { Search, X } from "lucide-react"
import { useState } from "react"

import { TableState } from "@/components/common/table-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
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
import { DeleteSegmentDialog } from "@/features/knowledge-bases/delete-segment-dialog"
import { knowledgeBasesApi } from "@/features/knowledge-bases/api"
import { KnowledgePagination } from "@/features/knowledge-bases/knowledge-pagination"
import { SegmentFormDialog } from "@/features/knowledge-bases/segment-form-dialog"
import type { ListParams } from "@/lib/api/client"
import { queryKeys } from "@/lib/query-keys"

type SegmentParams = ListParams & { documentId?: number }

const allDocumentsParams = {
  page: 1,
  pageSize: 100,
  search: "",
}

export function SegmentsPanel({ knowledgeBaseId }: { knowledgeBaseId: number }) {
  const [params, setParams] = useState<SegmentParams>({
    page: 1,
    pageSize: 10,
    search: "",
  })
  const documentsQuery = useQuery({
    queryKey: queryKeys.knowledgeBases.documentList(knowledgeBaseId, allDocumentsParams),
    queryFn: () => knowledgeBasesApi.listDocuments(knowledgeBaseId, allDocumentsParams),
  })
  const query = useQuery({
    queryKey: queryKeys.knowledgeBases.segmentList(knowledgeBaseId, params),
    queryFn: () => knowledgeBasesApi.listSegments(knowledgeBaseId, params),
  })
  const documentStatuses = new Map(
    documentsQuery.data?.items.map((item) => [item.id, item.status]) ?? [],
  )

  function search(formData: FormData) {
    setParams((current) => ({
      ...current,
      page: 1,
      search: String(formData.get("segment-search") || "").trim().slice(0, 100),
    }))
  }

  return (
    <Card className="surface-panel gap-0 py-0">
      <CardHeader className="border-b py-4">
        <CardTitle>分段</CardTitle>
        <CardDescription>
          检查可检索内容，并对已完成文档的分段进行精细编辑
        </CardDescription>
      </CardHeader>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <form action={search} className="flex min-w-0 flex-1 gap-2 sm:max-w-md">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              key={params.search}
              name="segment-search"
              defaultValue={params.search}
              placeholder="搜索分段内容"
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
              aria-label="清除分段搜索"
              onClick={() => setParams((current) => ({ ...current, page: 1, search: "" }))}
            >
              <X />
            </Button>
          ) : null}
        </form>
        <Select
          value={params.documentId ? String(params.documentId) : "all"}
          onValueChange={(value) =>
            setParams((current) => ({
              ...current,
              page: 1,
              documentId: value === "all" ? undefined : Number(value),
            }))
          }
        >
          <SelectTrigger className="w-full sm:w-64" aria-label="按文档筛选分段">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部文档</SelectItem>
            {documentsQuery.data?.items.map((document) => (
              <SelectItem key={document.id} value={String(document.id)}>
                {document.file_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto border-t">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">位置</TableHead>
              <TableHead>内容</TableHead>
              <TableHead>关键词</TableHead>
              <TableHead>统计</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableState
              columns={5}
              pending={query.isPending}
              error={query.error}
              empty={!query.data?.items.length}
              onRetry={() => query.refetch()}
            />
            {query.data?.items.map((segment) => {
              const documentStatus = documentStatuses.get(segment.document_id)
              const editable =
                documentStatus === undefined || documentStatus === "completed"
              return (
                <TableRow key={segment.id}>
                  <TableCell className="font-mono text-xs">
                    <span className="block">#{segment.position}</span>
                    <span className="text-muted-foreground">doc {segment.document_id}</span>
                  </TableCell>
                  <TableCell className="min-w-80 max-w-3xl">
                    <p className="line-clamp-3 whitespace-pre-wrap text-sm" title={segment.content}>
                      {segment.content}
                    </p>
                  </TableCell>
                  <TableCell className="min-w-40 max-w-64">
                    <div className="flex flex-wrap gap-1">
                      {segment.keywords?.length ? (
                        segment.keywords.slice(0, 5).map((keyword) => (
                          <Badge key={keyword} variant="secondary">{keyword}</Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-32 text-xs">
                    <span className="block">{segment.word_count} 字 · {segment.token_count} tokens</span>
                    <span className="text-muted-foreground">命中 {segment.hit_count} 次</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <SegmentFormDialog knowledgeBaseId={knowledgeBaseId} segment={segment} disabled={!editable} />
                      <DeleteSegmentDialog knowledgeBaseId={knowledgeBaseId} segment={segment} disabled={!editable} />
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
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
