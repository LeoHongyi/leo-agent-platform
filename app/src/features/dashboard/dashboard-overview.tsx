"use client"

import { useQueries, useQuery } from "@tanstack/react-query"
import {
  Activity,
  CheckCircle2,
  CloudCog,
  Cpu,
  KeyRound,
  ShieldCheck,
  Users,
} from "lucide-react"

import { PageHeader } from "@/components/common/page-header"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { authApi } from "@/features/auth/api"
import { permissionsApi } from "@/features/permissions/api"
import { modelsApi } from "@/features/models/api"
import { providersApi } from "@/features/providers/api"
import { rolesApi } from "@/features/roles/api"
import { usersApi } from "@/features/users/api"
import { queryKeys } from "@/lib/query-keys"

const summaryParams = { page: 1, pageSize: 1, search: "" }

export function DashboardOverview() {
  const me = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: authApi.me,
  })
  const access = useQuery({
    queryKey: queryKeys.auth.access,
    queryFn: authApi.access,
  })
  const summaries = useQueries({
    queries: [
      {
        queryKey: queryKeys.users.list(summaryParams),
        queryFn: () => usersApi.list(summaryParams),
      },
      {
        queryKey: queryKeys.roles.list(summaryParams),
        queryFn: () => rolesApi.list(summaryParams),
      },
      {
        queryKey: queryKeys.permissions.list(summaryParams),
        queryFn: () => permissionsApi.list(summaryParams),
      },
      {
        queryKey: queryKeys.providers.list(summaryParams),
        queryFn: () => providersApi.list(summaryParams),
      },
      {
        queryKey: queryKeys.models.list(summaryParams),
        queryFn: () => modelsApi.list(summaryParams),
      },
    ],
  })

  const cards = [
    {
      label: "用户总数",
      value: summaries[0].data?.total,
      icon: Users,
      description: "平台已注册用户",
    },
    {
      label: "角色总数",
      value: summaries[1].data?.total,
      icon: ShieldCheck,
      description: "可分配的角色",
    },
    {
      label: "权限总数",
      value: summaries[2].data?.total,
      icon: KeyRound,
      description: "已定义权限标识",
    },
    {
      label: "供应商总数",
      value: summaries[3].data?.total,
      icon: CloudCog,
      description: "已配置模型供应商",
    },
    {
      label: "模型总数",
      value: summaries[4].data?.total,
      icon: Cpu,
      description: "已配置可调用模型",
    },
  ]

  return (
    <>
      <PageHeader
        title="工作台"
        description="查看平台身份、权限和模型连接概况"
        action={
          <Badge variant="secondary" className="w-fit gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            当前会话有效
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card, index) => (
          <Card key={card.label} className="surface-panel">
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <card.icon className="size-4.5" />
                </span>
                <Activity className="size-4 text-muted-foreground/60" />
              </div>
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-3xl">
                {summaries[index].isPending
                  ? "—"
                  : (card.value ?? "—")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {card.description}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="surface-panel">
          <CardHeader>
            <CardTitle>当前用户</CardTitle>
            <CardDescription>服务端验证并注入的会话信息</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InfoRow label="用户名" value={me.data?.username ?? "—"} />
            <InfoRow label="邮箱" value={me.data?.email ?? "—"} />
            <InfoRow
              label="状态"
              value={me.data?.is_active ? "已启用" : "已停用"}
            />
          </CardContent>
        </Card>

        <Card className="surface-panel">
          <CardHeader>
            <CardTitle>访问范围</CardTitle>
            <CardDescription>
              当前 JWT 对应的角色与权限代码
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <CodeList
              label="角色"
              values={access.data?.roles ?? []}
              empty="尚未分配角色"
            />
            <CodeList
              label="权限"
              values={access.data?.permissions ?? []}
              empty="尚未分配权限"
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function CodeList({
  label,
  values,
  empty,
}: {
  label: string
  values: string[]
  empty: string
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
        {values.length ? (
          values.map((value) => (
            <Badge key={value} variant="outline">
              {value}
            </Badge>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">{empty}</span>
        )}
      </div>
    </div>
  )
}
