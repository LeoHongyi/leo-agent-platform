import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { LoginForm } from "@/features/auth/login-form"
import { getAuthSession } from "@/lib/api/server"

export const metadata: Metadata = {
  title: "登录",
}

type LoginPageProps = {
  searchParams: Promise<{ next?: string | string[] }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (await getAuthSession()) redirect("/dashboard")

  const rawNext = (await searchParams).next
  const candidate = Array.isArray(rawNext) ? rawNext[0] : rawNext
  const nextPath =
    candidate?.startsWith("/") && !candidate.startsWith("//")
      ? candidate
      : "/dashboard"

  return <LoginForm nextPath={nextPath} />
}
