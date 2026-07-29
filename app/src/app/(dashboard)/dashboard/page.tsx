import type { Metadata } from "next"

import { DashboardOverview } from "@/features/dashboard/dashboard-overview"

export const metadata: Metadata = {
  title: "工作台",
}

export default function DashboardPage() {
  return <DashboardOverview />
}
