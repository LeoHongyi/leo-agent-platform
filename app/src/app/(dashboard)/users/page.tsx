import type { Metadata } from "next"

import { UsersPageClient } from "@/features/users/users-page-client"
import {
  parseListParams,
  type PageSearchParams,
} from "@/lib/list-params"

export const metadata: Metadata = {
  title: "用户管理",
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>
}) {
  return <UsersPageClient params={parseListParams(await searchParams)} />
}
