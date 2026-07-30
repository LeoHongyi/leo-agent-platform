import { NextRequest, NextResponse } from "next/server"

import {
  ACCESS_TOKEN_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/session"
import { normalizeHttpStatus } from "@/lib/api/response"
import { serverEnv } from "@/lib/env"

type RouteContext = {
  params: Promise<{ path: string[] }>
}

const publicRoutes = new Set([
  "GET /api/v1/captcha",
  "POST /api/v1/captcha/verify",
  "GET /health",
])

const allowedRoutes = [
  /^(GET|POST) \/api\/v1\/users$/,
  /^(GET) \/api\/v1\/users\/me$/,
  /^(GET) \/api\/v1\/users\/\d+$/,
  /^(GET|PUT) \/api\/v1\/users\/\d+\/roles$/,
  /^(GET) \/api\/v1\/auth\/access$/,
  /^(GET|POST) \/api\/v1\/permissions\/?$/,
  /^(GET|PUT|DELETE) \/api\/v1\/permissions\/\d+$/,
  /^(GET|POST) \/api\/v1\/roles$/,
  /^(GET|PUT|DELETE) \/api\/v1\/roles\/\d+$/,
  /^(PUT) \/api\/v1\/roles\/\d+\/permissions$/,
  /^(GET|POST) \/api\/v1\/providers$/,
  /^(GET|PUT|DELETE) \/api\/v1\/providers\/\d+$/,
  /^(POST) \/api\/v1\/providers\/\d+\/test$/,
  /^(GET|POST) \/api\/v1\/models$/,
  /^(GET|PUT|DELETE) \/api\/v1\/models\/\d+$/,
  /^(GET|POST) \/api\/v1\/prompts$/,
  /^(GET|PUT|DELETE) \/api\/v1\/prompts\/\d+$/,
  /^(POST) \/api\/v1\/prompts\/\d+\/(?:publish|rollback)$/,
  /^(GET) \/api\/v1\/prompts\/\d+\/versions$/,
  /^(GET|POST) \/api\/v1\/tools$/,
  /^(GET|PUT|DELETE) \/api\/v1\/tools\/\d+$/,
  /^(POST) \/api\/v1\/tools\/\d+\/(?:enable|disable|test)$/,
  /^(GET|POST) \/api\/v1\/captcha(?:\/verify)?$/,
  /^(GET) \/health$/,
]

export const dynamic = "force-dynamic"

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
  const routeKey = `${request.method} ${path}`

  if (!allowedRoutes.some((pattern) => pattern.test(routeKey))) {
    return NextResponse.json(
      { code: 404, message: "该后端路径未开放", data: null },
      { status: 404 },
    )
  }

  const isPublic = publicRoutes.has(routeKey)
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
    const upstream = await fetch(url, {
      method: request.method,
      headers: {
        Accept: "application/json",
        ...(contentType ? { "Content-Type": contentType } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.arrayBuffer(),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    })

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

function readBusinessCode(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "code" in payload &&
    typeof payload.code === "number"
  ) {
    return payload.code
  }
  return null
}
