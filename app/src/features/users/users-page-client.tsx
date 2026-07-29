"use client"

import { useQuery } from "@tanstack/react-query"
import { Mail } from "lucide-react"

import { ListToolbar } from "@/components/common/list-toolbar"
import { PageHeader } from "@/components/common/page-header"
import { TablePagination } from "@/components/common/table-pagination"
import { TableState } from "@/components/common/table-state"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AssignRolesDialog } from "@/features/users/assign-roles-dialog"
import { usersApi } from "@/features/users/api"
import { CreateUserDialog } from "@/features/users/create-user-dialog"
import type { ListParams } from "@/lib/api/client"
import { queryKeys } from "@/lib/query-keys"

export function UsersPageClient({ params }: { params: ListParams }) {
  const query = useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => usersApi.list(params),
  })
  const items = query.data?.items ?? []

  return (
    <>
      <PageHeader
        title="用户管理"
        description="按用户名或邮箱搜索用户，并管理用户角色"
        action={<CreateUserDialog />}
      />
      <Card className="surface-panel gap-0 py-0">
        <div className="p-4">
          <ListToolbar
            search={params.search}
            placeholder="搜索用户名或邮箱"
          />
        </div>
        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead>用户</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableState
                columns={5}
                pending={query.isPending}
                error={query.error}
                empty={!items.length}
                onRetry={() => query.refetch()}
              />
              {items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono text-muted-foreground">
                    {user.id}
                  </TableCell>
                  <TableCell className="font-medium">
                    {user.username}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="size-3.5" />
                      {user.email}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.is_active ? "secondary" : "outline"}
                    >
                      {user.is_active ? "已启用" : "已停用"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <AssignRolesDialog user={user} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <TablePagination params={params} total={query.data?.total ?? 0} />
      </Card>
    </>
  )
}
