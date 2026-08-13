import type {
  ChunkMethod,
  DocumentStatus,
  KnowledgeBaseStatus,
  RetrievalStrategy,
} from "@/lib/api/schemas"

export const knowledgeBaseStatusLabels: Record<KnowledgeBaseStatus, string> = {
  empty: "空知识库",
  indexing: "正在索引",
  ready: "已就绪",
  error: "处理异常",
}

export const documentStatusLabels: Record<DocumentStatus, string> = {
  pending: "等待处理",
  processing: "处理中",
  completed: "已完成",
  failed: "处理失败",
}

export const chunkMethodOptions: Array<{
  value: ChunkMethod
  label: string
}> = [
  { value: "fixed", label: "固定长度" },
  { value: "sentence", label: "按句子" },
  { value: "paragraph", label: "按段落" },
]

export const retrievalStrategyOptions: Array<{
  value: RetrievalStrategy
  label: string
}> = [
  { value: "keyword", label: "关键词" },
  { value: "hybrid", label: "混合（当前为词法候选）" },
  { value: "semantic", label: "语义（暂未开放）" },
]

export const documentStatusOptions: Array<{
  value: DocumentStatus
  label: string
}> = (Object.entries(documentStatusLabels) as Array<
  [DocumentStatus, string]
>).map(([value, label]) => ({ value, label }))

export const supportedKnowledgeFileTypes = ".txt,.md,.csv,.html,.docx,.pdf"
export const maxKnowledgeFileBytes = 20 * 1024 * 1024
