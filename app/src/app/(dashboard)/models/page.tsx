import type { Metadata } from "next"

import { ModelsPageClient } from "@/features/models/models-page-client"
import {
  parseListParams,
  parseOptionalPositiveInteger,
  type PageSearchParams,
} from "@/lib/list-params"

export const metadata: Metadata = {
  title: "模型管理",
}

export default async function ModelsPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>
}) {
  const rawParams = await searchParams
  return (
    <ModelsPageClient
      params={{
        ...parseListParams(rawParams),
        providerId: parseOptionalPositiveInteger(rawParams.provider_id),
      }}
    />
  )
}
