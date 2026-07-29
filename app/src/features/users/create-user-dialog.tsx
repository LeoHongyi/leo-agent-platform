"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LoaderCircle, Plus } from "lucide-react"
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
import { usersApi } from "@/features/users/api"
import {
  userCreateSchema,
  type UserCreateInput,
} from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

export function CreateUserDialog() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<UserCreateInput>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: { username: "", email: "", password: "" },
  })
  const mutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      toast.success("用户创建成功")
      form.reset()
      setOpen(false)
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="w-fit" />}>
        <Plus />
        新建用户
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建用户</DialogTitle>
          <DialogDescription>
            创建登录账号，后续可为用户分配角色。
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit((value) => mutation.mutate(value))}
        >
          <FormField
            label="用户名"
            htmlFor="create-username"
            error={form.formState.errors.username?.message}
          >
            <Input
              id="create-username"
              autoComplete="off"
              aria-invalid={Boolean(form.formState.errors.username)}
              {...form.register("username")}
            />
          </FormField>
          <FormField
            label="邮箱"
            htmlFor="create-email"
            error={form.formState.errors.email?.message}
          >
            <Input
              id="create-email"
              type="email"
              autoComplete="off"
              aria-invalid={Boolean(form.formState.errors.email)}
              {...form.register("email")}
            />
          </FormField>
          <FormField
            label="初始密码"
            htmlFor="create-password"
            error={form.formState.errors.password?.message}
          >
            <Input
              id="create-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(form.formState.errors.password)}
              {...form.register("password")}
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
              创建
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
