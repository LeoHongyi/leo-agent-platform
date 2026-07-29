import "server-only"

import { cookies } from "next/headers"

import {
  accessCodesSchema,
  userSchema,
  type AccessCodes,
  type User,
} from "@/lib/api/schemas"
import { parseEnvelope } from "@/lib/api/response"
import { serverEnv } from "@/lib/env"
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/session"

export type AuthSession = {
  user: User
  access: AccessCodes
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value
  if (!token) return null

  try {
    const [userPayload, accessPayload] = await Promise.all([
      fetchBackend("/api/v1/users/me", token),
      fetchBackend("/api/v1/auth/access", token),
    ])

    return {
      user: parseEnvelope(userPayload, userSchema),
      access: parseEnvelope(accessPayload, accessCodesSchema),
    }
  } catch {
    return null
  }
}

async function fetchBackend(path: string, token: string) {
  const response = await fetch(new URL(path, serverEnv.BACKEND_API_URL), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`)
  }

  return response.json() as Promise<unknown>
}
