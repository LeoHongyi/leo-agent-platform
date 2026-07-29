"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { LoaderCircle, ShieldPlus } from "lucide-react"
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
import { rolesApi } from "@/features/roles/api"
import { usersApi } from "@/features/users/api"
import type { User } from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

const allRolesParams = { page: 1, pageSize: 100, search: "" }

export function AssignRolesDialog({ user }: { user: User }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const roles = useQuery({
    queryKey: queryKeys.roles.list(allRolesParams),
    queryFn: () => rolesApi.list(allRolesParams),
    enabled: open,
  })
  const assigned = useQuery({
    queryKey: queryKeys.users.roles(user.id),
    queryFn: () => usersApi.roles(user.id),
    enabled: open,
  })
  const mutation = useMutation({
    mutationFn: (roleIds: number[]) => usersApi.assignRoles(user.id, roleIds),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.users.roles(user.id),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
      ])
      toast.success("用户角色已更新，权限缓存将重新生成")
      setOpen(false)
    },
    onError: (error) => toast.error(error.message),
  })

  function submit(formData: FormData) {
    mutation.mutate(
      formData.getAll("role_ids").map((value) => Number(value)),
    )
  }

  const pending = roles.isPending || assigned.isPending
  const assignedIds = new Set(assigned.data?.map((role) => role.id))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" />}
      >
        <ShieldPlus />
        分配角色
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>为 {user.username} 分配角色</DialogTitle>
          <DialogDescription>
            保存后会清除该用户的角色与权限缓存。
          </DialogDescription>
        </DialogHeader>
        {pending ? (
          <div className="grid h-36 place-items-center">
            <LoaderCircle className="animate-spin text-muted-foreground" />
          </div>
        ) : roles.error || assigned.error ? (
          <p className="py-8 text-center text-sm text-destructive">
            {(roles.error || assigned.error)?.message}
          </p>
        ) : (
          <form
            key={assigned.data?.map((role) => role.id).join("-") || "none"}
            action={submit}
          >
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {roles.data?.items.length ? (
                roles.data.items.map((role) => (
                  <label
                    key={role.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition hover:bg-muted/60"
                  >
                    <input
                      type="checkbox"
                      name="role_ids"
                      value={role.id}
                      defaultChecked={assignedIds.has(role.id)}
                      className="mt-1 size-4 accent-primary"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {role.name}
                      </span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {role.code}
                      </span>
                    </span>
                  </label>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  请先创建角色
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
