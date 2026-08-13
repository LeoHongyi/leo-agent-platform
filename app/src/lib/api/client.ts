"use client"

import { z } from "zod"

import {
  ApiError,
  messageFromUnknown,
  normalizeHttpStatus,
  parseEnvelope,
  type PageResult,
} from "@/lib/api/response"
import type { DocumentStatus } from "@/lib/api/schemas"

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown
}

type ApiFormDataRequestOptions = Omit<RequestInit, "body">

export type DownloadResult = {
  blob: Blob
  fileName: string
  contentType: string
}

export async function apiRequest<T>(
  url: string,
  dataSchema: z.ZodType<T>,
  options: ApiRequestOptions = {},
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: requestHeaders(options.headers, {
      accept: "application/json",
      contentType:
        options.body === undefined ? undefined : "application/json",
    }),
    body:
      options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const payload = await parseJson(response)

  if (!response.ok) {
    throw new ApiError(
      messageFromUnknown(payload, `请求失败（${response.status}）`),
      response.status,
    )
  }

  return parseEnvelope(payload, dataSchema, response.status)
}

export async function apiMutation(
  url: string,
  options: ApiRequestOptions = {},
) {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: requestHeaders(options.headers, {
      accept: "application/json",
      contentType:
        options.body === undefined ? undefined : "application/json",
    }),
    body:
      options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const payload = await parseJson(response)

  if (!response.ok) {
    throw new ApiError(
      messageFromUnknown(payload, `请求失败（${response.status}）`),
      response.status,
    )
  }

  const parsed = z
    .object({
      code: z.number(),
      message: z.string(),
      data: z.unknown().nullable(),
    })
    .safeParse(payload)

  if (!parsed.success || parsed.data.code < 200 || parsed.data.code >= 300) {
    throw new ApiError(
      parsed.success ? parsed.data.message : "服务端返回了无法识别的数据",
      parsed.success ? parsed.data.code : response.status,
    )
  }

  return parsed.data
}

export async function apiFormDataRequest<T>(
  url: string,
  dataSchema: z.ZodType<T>,
  formData: FormData,
  options: ApiFormDataRequestOptions = {},
): Promise<T> {
  const headers = requestHeaders(options.headers, {
    accept: "application/json",
  })
  // The browser must generate the multipart boundary for FormData.
  headers.delete("Content-Type")

  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers,
    body: formData,
  })
  const payload = await parseJson(response)

  if (!response.ok) {
    throw new ApiError(
      messageFromUnknown(payload, `请求失败（${response.status}）`),
      response.status,
    )
  }

  return parseEnvelope(payload, dataSchema, response.status)
}

export async function apiDownload(
  url: string,
  options: ApiFormDataRequestOptions = {},
): Promise<DownloadResult> {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: requestHeaders(options.headers, {
      accept: "application/octet-stream, application/json",
    }),
  })
  const contentType =
    response.headers.get("Content-Type") || "application/octet-stream"

  if (isJsonContentType(contentType)) {
    const payload = await parseJson(response)
    const businessError = z
      .object({ code: z.number(), message: z.string() })
      .safeParse(payload)
    const code = businessError.success
      ? businessError.data.code
      : response.status || 500
    throw new ApiError(
      messageFromUnknown(payload, `下载失败（${response.status}）`),
      response.ok ? normalizeHttpStatus(code) : response.status,
      code,
    )
  }

  if (!response.ok) {
    throw new ApiError(`下载失败（${response.status}）`, response.status)
  }

  return {
    blob: await response.blob(),
    fileName: fileNameFromContentDisposition(
      response.headers.get("Content-Disposition"),
    ),
    contentType,
  }
}

export function pageQueryString(params: ListParams) {
  const search = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.pageSize),
  })
  if (params.search) search.set("keyword", params.search)
  return search.toString()
}

export type ListParams = {
  page: number
  pageSize: number
  search: string
}

export type ModelListParams = ListParams & {
  providerId?: number
}

export type KnowledgeDocumentListParams = ListParams & {
  status?: DocumentStatus
}

export type KnowledgeSegmentListParams = ListParams & {
  documentId?: number
}

export type { PageResult }

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new ApiError("服务端未返回 JSON 数据", response.status || 502)
  }
}

function requestHeaders(
  initialHeaders: HeadersInit | undefined,
  defaults: { accept: string; contentType?: string },
) {
  const headers = new Headers(initialHeaders)
  if (!headers.has("Accept")) headers.set("Accept", defaults.accept)
  if (defaults.contentType && !headers.has("Content-Type")) {
    headers.set("Content-Type", defaults.contentType)
  }
  return headers
}

function isJsonContentType(contentType: string) {
  const mediaType = contentType.split(";", 1)[0]?.trim().toLowerCase()
  return mediaType === "application/json" || mediaType?.endsWith("+json")
}

export function fileNameFromContentDisposition(
  contentDisposition: string | null,
) {
  if (!contentDisposition) return "download"

  const encodedMatch = contentDisposition.match(/filename\*\s*=\s*([^;]+)/i)
  if (encodedMatch?.[1]) {
    const encodedValue = unquote(encodedMatch[1].trim())
    const extendedValue = encodedValue.match(/^[^']*'[^']*'(.*)$/)?.[1]
    const fileName = decodeFileName(extendedValue ?? encodedValue)
    if (fileName) return safeFileName(fileName)
  }

  const plainMatch = contentDisposition.match(
    /filename\s*=\s*(?:"((?:\\.|[^"])*)"|([^;]+))/i,
  )
  const plainValue = plainMatch?.[1] ?? plainMatch?.[2]
  if (!plainValue) return "download"
  return safeFileName(plainValue.trim().replace(/\\"/g, '"'))
}

function decodeFileName(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function unquote(value: string) {
  return value.startsWith('"') && value.endsWith('"')
    ? value.slice(1, -1)
    : value
}

function safeFileName(value: string) {
  const fileName = value.split(/[\\/]/).at(-1)?.replace(/[\u0000-\u001f\u007f]/g, "")
  return fileName || "download"
}
