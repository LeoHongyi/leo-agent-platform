"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { KeyRound, LoaderCircle } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { permissionsApi } from "@/features/permissions/api"
import { rolesApi } from "@/features/roles/api"
import type { Role } from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

const allPermissionsParams = { page: 1, pageSize: 100, search: "" }

export function AssignPermissionsDialog({ role }: { role: Role }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const permissions = useQuery({
    queryKey: queryKeys.permissions.list(allPermissionsParams),
    queryFn: () => permissionsApi.list(allPermissionsParams),
    enabled: open,
  })
  const mutation = useMutation({
    mutationFn: (permissionIds: number[]) =>
      rolesApi.assignPermissions(role.id, permissionIds),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.roles.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.access }),
      ])
      toast.success("角色权限已更新，相关用户缓存将重新生成")
      setOpen(false)
    },
    onError: (error) => toast.error(error.message),
  })
  const assignedIds = new Set(
    role.permissions.map((permission) => permission.id),
  )

  function submit(formData: FormData) {
    mutation.mutate(
      formData.getAll("permission_ids").map((value) => Number(value)),
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" />}
      >
        <KeyRound />
        权限
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>配置 {role.name} 的权限</DialogTitle>
          <DialogDescription>
            保存后会清除拥有该角色用户的权限缓存。
          </DialogDescription>
        </DialogHeader>
        {permissions.isPending ? (
          <div className="grid h-36 place-items-center">
            <LoaderCircle className="animate-spin text-muted-foreground" />
          </div>
        ) : permissions.error ? (
          <p className="py-8 text-center text-sm text-destructive">
            {permissions.error.message}
          </p>
        ) : (
          <form action={submit}>
            <div className="grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {permissions.data?.items.length ? (
                permissions.data.items.map((permission) => (
                  <label
                    key={permission.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition hover:bg-muted/60"
                  >
                    <input
                      type="checkbox"
                      name="permission_ids"
                      value={permission.id}
                      defaultChecked={assignedIds.has(permission.id)}
                      className="mt-1 size-4 accent-primary"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {permission.name}
                      </span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {permission.code}
                      </span>
                    </span>
                  </label>
                ))
              ) : (
                <p className="col-span-2 py-8 text-center text-sm text-muted-foreground">
                  请先创建权限
                </p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : null}
                保存
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
