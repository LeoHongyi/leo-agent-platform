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
import { DeletePermissionDialog } from "@/features/permissions/delete-permission-dialog"
import { PermissionFormDialog } from "@/features/permissions/permission-form-dialog"
import { permissionsApi } from "@/features/permissions/api"
import type { ListParams } from "@/lib/api/client"
import { queryKeys } from "@/lib/query-keys"

export function PermissionsPageClient({ params }: { params: ListParams }) {
  const query = useQuery({
    queryKey: queryKeys.permissions.list(params),
    queryFn: () => permissionsApi.list(params),
  })
  const items = query.data?.items ?? []

  return (
    <>
      <PageHeader
        title="权限管理"
        description="按权限标识或名称搜索，维护平台操作权限"
        action={<PermissionFormDialog />}
      />
      <Card className="surface-panel gap-0 py-0">
        <div className="p-4">
          <ListToolbar
            search={params.search}
            placeholder="搜索权限标识或名称"
          />
        </div>
        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead>权限</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>格式</TableHead>
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
              {items.map((permission) => (
                <TableRow key={permission.id}>
                  <TableCell className="font-mono text-muted-foreground">
                    {permission.id}
                  </TableCell>
                  <TableCell>
                    <span className="block font-medium">
                      {permission.name}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {permission.code}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-md truncate text-muted-foreground">
                    {permission.description || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">resource:action</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <PermissionFormDialog permission={permission} />
                      <DeletePermissionDialog permission={permission} />
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
