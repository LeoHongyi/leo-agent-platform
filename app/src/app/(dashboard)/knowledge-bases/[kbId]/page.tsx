import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { KnowledgeBaseDetailPageClient } from "@/features/knowledge-bases/knowledge-base-detail-page-client"

export const metadata: Metadata = {
  title: "知识库详情",
}

export default async function KnowledgeBaseDetailPage({
  params,
}: {
  params: Promise<{ kbId: string }>
}) {
  const { kbId: rawKbId } = await params
  const kbId = Number(rawKbId)

  if (!Number.isInteger(kbId) || kbId <= 0) notFound()

  return <KnowledgeBaseDetailPageClient knowledgeBaseId={kbId} />
}
