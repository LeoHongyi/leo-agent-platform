import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies"

export const ACCESS_TOKEN_COOKIE = "leo_access_token"
export const SESSION_MAX_AGE_SECONDS = 30 * 60

export const sessionCookieOptions: Partial<ResponseCookie> = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
}
