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
import { rolesApi } from "@/features/roles/api"
import {
  roleCreateSchema,
  type Role,
  type RoleCreateInput,
} from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

export function RoleFormDialog({ role }: { role?: Role }) {
  const editing = Boolean(role)
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<RoleCreateInput>({
    resolver: zodResolver(roleCreateSchema),
    defaultValues: {
      code: role?.code ?? "",
      name: role?.name ?? "",
      description: role?.description ?? "",
    },
  })
  const mutation = useMutation({
    mutationFn: (value: RoleCreateInput) =>
      role
        ? rolesApi.update(role.id, {
            name: value.name,
            description: value.description,
          })
        : rolesApi.create(value),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
      toast.success(editing ? "角色已更新" : "角色创建成功")
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
        {editing ? "编辑" : "新建角色"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "编辑角色" : "新建角色"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "角色标识创建后不可修改。"
              : "角色标识建议使用简洁的英文小写名称。"}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit((value) => mutation.mutate(value))}
        >
          <FormField
            label="角色标识"
            htmlFor={`role-code-${role?.id ?? "new"}`}
            error={form.formState.errors.code?.message}
            hint="例如 admin、developer"
          >
            <Input
              id={`role-code-${role?.id ?? "new"}`}
              disabled={editing}
              aria-invalid={Boolean(form.formState.errors.code)}
              {...form.register("code")}
            />
          </FormField>
          <FormField
            label="角色名称"
            htmlFor={`role-name-${role?.id ?? "new"}`}
            error={form.formState.errors.name?.message}
          >
            <Input
              id={`role-name-${role?.id ?? "new"}`}
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register("name")}
            />
          </FormField>
          <FormField
            label="描述"
            htmlFor={`role-description-${role?.id ?? "new"}`}
            error={form.formState.errors.description?.message}
          >
            <Textarea
              id={`role-description-${role?.id ?? "new"}`}
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
