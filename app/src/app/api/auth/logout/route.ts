import { NextRequest, NextResponse } from "next/server"

import {
  ACCESS_TOKEN_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/session"
import { serverEnv } from "@/lib/env"

export async function POST(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value

  if (token) {
    try {
      await fetch(new URL("/api/v1/auth/logout", serverEnv.BACKEND_API_URL), {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      })
    } catch {
      // 本地会话仍然需要失效，后端不可用不应阻止退出。
    }
  }

  const response = NextResponse.json({
    code: 200,
    message: "已退出登录",
    data: { authenticated: false },
  })
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", {
    ...sessionCookieOptions,
    maxAge: 0,
  })
  return response
}
