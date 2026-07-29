import type {
  ToolStatus,
  ToolType,
} from "@/lib/api/schemas"

export const toolTypeLabels: Record<ToolType, string> = {
  builtin: "内置工具",
  http_api: "HTTP API",
  custom_function: "自定义函数",
}

export const toolStatusLabels: Record<ToolStatus, string> = {
  disabled: "已禁用",
  enabled: "已启用",
  error: "异常",
}

export const toolTypeOptions: Array<{
  value: ToolType
  label: string
}> = [
  { value: "builtin", label: toolTypeLabels.builtin },
  { value: "http_api", label: toolTypeLabels.http_api },
  { value: "custom_function", label: toolTypeLabels.custom_function },
]

export const toolConfigHints: Record<ToolType, string> = {
  builtin: "内置工具的运行参数；没有额外配置时填写 {}",
  http_api:
    '需要 url，可选 method、headers 和 timeout_seconds，例如 {"url":"https://api.example.com/tool","method":"POST"}',
  custom_function: "自定义函数的运行参数；没有额外配置时填写 {}",
}

export function stringifyJson(value: Record<string, unknown> | null) {
  return value ? JSON.stringify(value, null, 2) : ""
}

export function parseJsonObject(value: string) {
  if (!value.trim()) return null
  return JSON.parse(value) as Record<string, unknown>
}
