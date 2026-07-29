"use client"

import { z } from "zod"

import {
  ApiError,
  messageFromUnknown,
  parseEnvelope,
  type PageResult,
} from "@/lib/api/response"

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown
}

export async function apiRequest<T>(
  url: string,
  dataSchema: z.ZodType<T>,
  options: ApiRequestOptions = {},
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(options.body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
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
    headers: {
      Accept: "application/json",
      ...(options.body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
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

export type { PageResult }

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new ApiError("服务端未返回 JSON 数据", response.status || 502)
  }
}
