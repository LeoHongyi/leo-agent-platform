"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LoaderCircle, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { providersApi } from "@/features/providers/api"
import type { Provider } from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

export function DeleteProviderDialog({
  provider,
}: {
  provider: Provider
}) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => providersApi.remove(provider.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.providers.all,
      })
      toast.success("供应商已删除")
      setOpen(false)
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={<Button variant="destructive" size="icon-sm" />}
        aria-label={`删除供应商 ${provider.name}`}
      >
        <Trash2 />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除供应商？</AlertDialogTitle>
          <AlertDialogDescription>
            将删除“{provider.name}”及其加密保存的连接凭据。依赖该供应商的模型配置可能无法继续使用，此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <LoaderCircle className="animate-spin" />
            ) : null}
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
