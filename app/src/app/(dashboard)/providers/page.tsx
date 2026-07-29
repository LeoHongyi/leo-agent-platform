import type { Metadata } from "next"

import { ProvidersPageClient } from "@/features/providers/providers-page-client"
import {
  parseListParams,
  type PageSearchParams,
} from "@/lib/list-params"

export const metadata: Metadata = {
  title: "模型供应商",
}

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>
}) {
  return (
    <ProvidersPageClient params={parseListParams(await searchParams)} />
  )
}
