import { NextRequest, NextResponse } from "next/server"

import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/session"

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(ACCESS_TOKEN_COOKIE)

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    )
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/users/:path*",
    "/roles/:path*",
    "/permissions/:path*",
    "/providers/:path*",
    "/models/:path*",
    "/prompts/:path*",
    "/tools/:path*",
    "/knowledge-bases/:path*",
    "/agents/:path*",
  ],
}
