import type {
  PromptStatus,
  PromptVariableType,
} from "@/lib/api/schemas"

export const promptStatusLabels: Record<PromptStatus, string> = {
  draft: "草稿",
  published: "已发布",
}

export const promptVariableTypeOptions: Array<{
  value: PromptVariableType
  label: string
}> = [
  { value: "string", label: "字符串" },
  { value: "number", label: "数字" },
  { value: "boolean", label: "布尔值" },
  { value: "text", label: "长文本" },
]

export function parsePromptTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  )
}
