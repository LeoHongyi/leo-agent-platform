import type { ListParams } from "@/lib/api/client"

export type PageSearchParams = {
  page?: string | string[]
  page_size?: string | string[]
  search?: string | string[]
  provider_id?: string | string[]
}

export function parseListParams(params: PageSearchParams): ListParams {
  const page = boundedInteger(first(params.page), 1, 1, Number.MAX_SAFE_INTEGER)
  const pageSize = boundedInteger(first(params.page_size), 10, 1, 100)
  const search = (first(params.search) || "").trim().slice(0, 100)
  return { page, pageSize, search }
}

export function parseOptionalPositiveInteger(
  value: string | string[] | undefined,
) {
  const parsed = Number(first(value))
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function boundedInteger(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const value = Number(raw)
  if (!Number.isInteger(value)) return fallback
  return Math.min(max, Math.max(min, value))
}
