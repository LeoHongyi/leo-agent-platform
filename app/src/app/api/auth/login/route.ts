import { NextResponse } from "next/server"

import { loginSchema, tokenSchema } from "@/lib/api/schemas"
import {
  ApiError,
  messageFromUnknown,
  parseEnvelope,
} from "@/lib/api/response"
import {
  ACCESS_TOKEN_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/session"
import { serverEnv } from "@/lib/env"

export async function POST(request: Request) {
  try {
    const body = loginSchema.safeParse(await request.json())
    if (!body.success) {
      return NextResponse.json(
        {
          code: 422,
          message: "登录信息校验失败",
          data: null,
          detail: body.error.issues,
        },
        { status: 422 },
      )
    }

    const upstream = await fetch(
      new URL("/api/v1/auth/login", serverEnv.BACKEND_API_URL),
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body.data),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    )
    const payload = await upstream.json()

    if (!upstream.ok) {
      return NextResponse.json(payload, { status: upstream.status })
    }

    const token = parseEnvelope(payload, tokenSchema, upstream.status)
    const response = NextResponse.json({
      code: 200,
      message: "登录成功",
      data: { authenticated: true },
    })
    response.cookies.set(
      ACCESS_TOKEN_COOKIE,
      token.access_token,
      sessionCookieOptions,
    )
    return response
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { code: error.code, message: error.message, data: null },
        { status: error.status },
      )
    }

    return NextResponse.json(
      {
        code: 502,
        message: messageFromUnknown(error, "认证服务暂时不可用"),
        data: null,
      },
      { status: 502 },
    )
  }
}
