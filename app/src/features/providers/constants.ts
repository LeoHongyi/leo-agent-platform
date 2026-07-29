import type {
  ProviderStatus,
  ProviderType,
} from "@/lib/api/schemas"

export const providerTypeOptions: ReadonlyArray<{
  value: ProviderType
  label: string
}> = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "aliyun", label: "阿里云百炼" },
  { value: "azure", label: "Azure OpenAI" },
  { value: "local", label: "本地模型" },
  { value: "custom", label: "自定义" },
]

export const providerTypeLabels: Record<ProviderType, string> =
  Object.fromEntries(
    providerTypeOptions.map((item) => [item.value, item.label]),
  ) as Record<ProviderType, string>

export const providerEndpointPlaceholders: Record<ProviderType, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com",
  aliyun: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  azure: "https://YOUR-RESOURCE-NAME.openai.azure.com",
  local: "http://127.0.0.1:11434/v1",
  custom: "https://api.example.com/v1",
}

export const providerStatusLabels: Record<ProviderStatus, string> = {
  connected: "已连接",
  disconnected: "未连接",
  error: "连接异常",
}

export const cloudProviderTypes = new Set<ProviderType>([
  "openai",
  "anthropic",
  "aliyun",
  "azure",
])
