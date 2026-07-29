import type { Metadata } from "next"

import { ToolsPageClient } from "@/features/tools/tools-page-client"
import {
  parseListParams,
  type PageSearchParams,
} from "@/lib/list-params"

export const metadata: Metadata = {
  title: "工具管理",
}

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>
}) {
  return (
    <ToolsPageClient params={parseListParams(await searchParams)} />
  )
}
