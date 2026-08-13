import { NextRequest, NextResponse } from "next/server"

import {
  ACCESS_TOKEN_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/session"
import {
  downloadResponseHeaders,
  isAllowedRoute,
  isJsonContentType,
  isKnowledgeDownloadRoute,
  isPublicRoute,
  readBusinessCode,
  requestTimeoutMs,
} from "@/lib/api/backend-proxy"
import { normalizeHttpStatus } from "@/lib/api/response"
import { serverEnv } from "@/lib/env"

type RouteContext = {
  params: Promise<{ path: string[] }>
}

export const dynamic = "force-dynamic"
export const maxDuration = 310

export async function GET(request: NextRequest, context: RouteContext) {
  return forwardRequest(request, context)
}

export async function POST(request: NextRequest, context: RouteContext) {
  return forwardRequest(request, context)
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return forwardRequest(request, context)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return forwardRequest(request, context)
}

async function forwardRequest(request: NextRequest, context: RouteContext) {
  const { path: segments } = await context.params
  const path = `/${segments.join("/")}`

  if (!isAllowedRoute(request.method, path)) {
    return NextResponse.json(
      { code: 404, message: "该后端路径未开放", data: null },
      { status: 404 },
    )
  }

  const isPublic = isPublicRoute(request.method, path)
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value
  if (!isPublic && !token) {
    return NextResponse.json(
      { code: 401, message: "登录状态已失效", data: null },
      { status: 401 },
    )
  }

  try {
    const upstreamPath =
      path === "/api/v1/permissions" ? `${path}/` : path
    const url = new URL(upstreamPath, serverEnv.BACKEND_API_URL)
    url.search = request.nextUrl.search

    const contentType = request.headers.get("content-type")
    const requestBody =
      request.method === "GET" || request.method === "HEAD"
        ? null
        : request.body
    const requestInit: RequestInit & { duplex?: "half" } = {
      method: request.method,
      headers: {
        Accept: isKnowledgeDownloadRoute(request.method, path)
          ? "*/*"
          : "application/json",
        ...(contentType ? { "Content-Type": contentType } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(requestTimeoutMs(request.method, path)),
      ...(requestBody ? { body: requestBody, duplex: "half" } : {}),
    }
    const upstream = await fetch(url, requestInit)

    const upstreamContentType = upstream.headers.get("content-type")
    if (
      upstream.ok &&
      isKnowledgeDownloadRoute(request.method, path) &&
      !isJsonContentType(upstreamContentType)
    ) {
      return new NextResponse(upstream.body, {
        status: upstream.status,
        headers: downloadResponseHeaders(upstream.headers),
      })
    }

    const text = await upstream.text()
    let payload: unknown = null
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      return NextResponse.json(
        { code: 502, message: "后端返回了非 JSON 数据", data: null },
        { status: 502 },
      )
    }

    const businessCode = readBusinessCode(payload)
    const status =
      upstream.ok && businessCode !== null && businessCode >= 400
        ? normalizeHttpStatus(businessCode)
        : upstream.status
    const response = NextResponse.json(payload, { status })

    if (status === 401) {
      response.cookies.set(ACCESS_TOKEN_COOKIE, "", {
        ...sessionCookieOptions,
        maxAge: 0,
      })
    }

    return response
  } catch {
    return NextResponse.json(
      { code: 502, message: "后端服务暂时不可用", data: null },
      { status: 502 },
    )
  }
}
