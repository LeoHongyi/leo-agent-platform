import type { Metadata } from "next"

import { PermissionsPageClient } from "@/features/permissions/permissions-page-client"
import {
  parseListParams,
  type PageSearchParams,
} from "@/lib/list-params"

export const metadata: Metadata = {
  title: "权限管理",
}

export default async function PermissionsPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>
}) {
  return (
    <PermissionsPageClient params={parseListParams(await searchParams)} />
  )
}
