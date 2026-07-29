"use client"

import { useQuery } from "@tanstack/react-query"

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
import { AssignPermissionsDialog } from "@/features/roles/assign-permissions-dialog"
import { DeleteRoleDialog } from "@/features/roles/delete-role-dialog"
import { RoleFormDialog } from "@/features/roles/role-form-dialog"
import { rolesApi } from "@/features/roles/api"
import type { ListParams } from "@/lib/api/client"
import { queryKeys } from "@/lib/query-keys"

export function RolesPageClient({ params }: { params: ListParams }) {
  const query = useQuery({
    queryKey: queryKeys.roles.list(params),
    queryFn: () => rolesApi.list(params),
  })
  const items = query.data?.items ?? []

  return (
    <>
      <PageHeader
        title="角色管理"
        description="按角色标识或名称搜索，并配置角色拥有的权限"
        action={<RoleFormDialog />}
      />
      <Card className="surface-panel gap-0 py-0">
        <div className="p-4">
          <ListToolbar
            search={params.search}
            placeholder="搜索角色标识或名称"
          />
        </div>
        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>权限数</TableHead>
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
              {items.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-mono text-muted-foreground">
                    {role.id}
                  </TableCell>
                  <TableCell>
                    <span className="block font-medium">{role.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {role.code}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {role.description || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {role.permissions.length}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <AssignPermissionsDialog role={role} />
                      <RoleFormDialog role={role} />
                      <DeleteRoleDialog role={role} />
                    </div>
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
