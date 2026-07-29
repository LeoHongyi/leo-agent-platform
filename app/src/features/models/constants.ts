import type { ModelStatus } from "@/lib/api/schemas"

export const modelStatusOptions: ReadonlyArray<{
  value: ModelStatus
  label: string
}> = [
  { value: "available", label: "可用" },
  { value: "unavailable", label: "不可用" },
  { value: "rate_limited", label: "限流中" },
]

export const modelStatusLabels: Record<ModelStatus, string> =
  Object.fromEntries(
    modelStatusOptions.map((item) => [item.value, item.label]),
  ) as Record<ModelStatus, string>

export function parseCapabilities(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}
