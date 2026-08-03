import type {
  AgentStatus,
  AgentType,
  RetrievalStrategy,
} from "@/lib/api/schemas"

export const agentTypeLabels: Record<AgentType, string> = {
  conversation: "对话",
  tool: "工具",
  analysis: "分析",
  creative: "创作",
  workflow: "工作流",
}

export const agentStatusLabels: Record<AgentStatus, string> = {
  draft: "草稿",
  inactive: "未运行",
  active: "运行中",
  error: "异常",
}

export const retrievalStrategyLabels: Record<RetrievalStrategy, string> = {
  keyword: "关键词",
  semantic: "语义",
  hybrid: "混合",
}

export const agentTypeOptions = Object.entries(agentTypeLabels).map(
  ([value, label]) => ({
    value: value as AgentType,
    label,
  }),
)

export const retrievalStrategyOptions = Object.entries(
  retrievalStrategyLabels,
).map(([value, label]) => ({
  value: value as RetrievalStrategy,
  label,
}))
