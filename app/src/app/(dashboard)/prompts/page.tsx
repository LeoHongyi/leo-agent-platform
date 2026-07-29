import type { Metadata } from "next"

import { PromptsPageClient } from "@/features/prompts/prompts-page-client"
import {
  parseListParams,
  type PageSearchParams,
} from "@/lib/list-params"

export const metadata: Metadata = {
  title: "Prompt 管理",
}

export default async function PromptsPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>
}) {
  return (
    <PromptsPageClient params={parseListParams(await searchParams)} />
  )
}
