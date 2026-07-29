import type { Metadata } from "next"

import { RolesPageClient } from "@/features/roles/roles-page-client"
import {
  parseListParams,
  type PageSearchParams,
} from "@/lib/list-params"

export const metadata: Metadata = {
  title: "角色管理",
}

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>
}) {
  return <RolesPageClient params={parseListParams(await searchParams)} />
}
