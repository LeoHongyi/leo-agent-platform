"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LoaderCircle, Pencil, Plus } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { FormField } from "@/components/common/form-field"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { permissionsApi } from "@/features/permissions/api"
import {
  permissionCreateSchema,
  type Permission,
  type PermissionCreateInput,
} from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

export function PermissionFormDialog({
  permission,
}: {
  permission?: Permission
}) {
  const editing = Boolean(permission)
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<PermissionCreateInput>({
    resolver: zodResolver(permissionCreateSchema),
    defaultValues: {
      code: permission?.code ?? "",
      name: permission?.name ?? "",
      description: permission?.description ?? "",
    },
  })
  const mutation = useMutation({
    mutationFn: (value: PermissionCreateInput) =>
      permission
        ? permissionsApi.update(permission.id, {
            name: value.name,
            description: value.description,
          })
        : permissionsApi.create(value),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.permissions.all,
      })
      toast.success(editing ? "权限已更新" : "权限创建成功")
      setOpen(false)
      if (!editing) form.reset()
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={editing ? "outline" : "default"}
            size={editing ? "sm" : "default"}
            className="w-fit"
          />
        }
      >
        {editing ? <Pencil /> : <Plus />}
        {editing ? "编辑" : "新建权限"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "编辑权限" : "新建权限"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "权限标识创建后不可修改。"
              : "权限标识使用 resource:action 格式。"}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit((value) => mutation.mutate(value))}
        >
          <FormField
            label="权限标识"
            htmlFor={`permission-code-${permission?.id ?? "new"}`}
            error={form.formState.errors.code?.message}
            hint="例如 user:list、role:update"
          >
            <Input
              id={`permission-code-${permission?.id ?? "new"}`}
              disabled={editing}
              aria-invalid={Boolean(form.formState.errors.code)}
              {...form.register("code")}
            />
          </FormField>
          <FormField
            label="权限名称"
            htmlFor={`permission-name-${permission?.id ?? "new"}`}
            error={form.formState.errors.name?.message}
          >
            <Input
              id={`permission-name-${permission?.id ?? "new"}`}
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register("name")}
            />
          </FormField>
          <FormField
            label="描述"
            htmlFor={`permission-description-${permission?.id ?? "new"}`}
            error={form.formState.errors.description?.message}
          >
            <Textarea
              id={`permission-description-${permission?.id ?? "new"}`}
              rows={3}
              {...form.register("description")}
            />
          </FormField>
          <DialogFooter>
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
      </DialogContent>
    </Dialog>
  )
}
