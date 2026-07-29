import "server-only"

import { z } from "zod"

const serverEnvSchema = z.object({
  BACKEND_API_URL: z.url().default("http://127.0.0.1:8000"),
})

export const serverEnv = serverEnvSchema.parse({
  BACKEND_API_URL: process.env.BACKEND_API_URL,
})

export const appName =
  process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Leo Agent Platform"
