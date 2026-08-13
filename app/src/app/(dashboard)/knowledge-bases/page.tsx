import type { Metadata } from "next"

import { KnowledgeBasesPageClient } from "@/features/knowledge-bases/knowledge-bases-page-client"
import {
  parseListParams,
  type PageSearchParams,
} from "@/lib/list-params"

export const metadata: Metadata = {
  title: "知识库管理",
}

export default async function KnowledgeBasesPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>
}) {
  return (
    <KnowledgeBasesPageClient params={parseListParams(await searchParams)} />
  )
}
