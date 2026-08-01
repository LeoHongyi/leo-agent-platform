import type { Metadata } from "next"

import { AgentsPageClient } from "@/features/agents/agents-page-client"
import {
  parseListParams,
  type PageSearchParams,
} from "@/lib/list-params"

export const metadata: Metadata = {
  title: "Agent 管理",
}

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>
}) {
  return (
    <AgentsPageClient params={parseListParams(await searchParams)} />
  )
}
