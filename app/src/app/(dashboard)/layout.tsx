import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/layout/dashboard-shell"
import { getAuthSession } from "@/lib/api/server"
import { getQueryClient } from "@/lib/query-client"
import { queryKeys } from "@/lib/query-keys"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const queryClient = getQueryClient()
  queryClient.setQueryData(queryKeys.auth.me, session.user)
  queryClient.setQueryData(queryKeys.auth.access, session.access)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardShell session={session}>{children}</DashboardShell>
    </HydrationBoundary>
  )
}
