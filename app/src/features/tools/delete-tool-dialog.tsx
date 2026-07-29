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
import { toolsApi } from "@/features/tools/api"
import type { Tool } from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

export function DeleteToolDialog({ tool }: { tool: Tool }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => toolsApi.remove(tool.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.tools.all,
      })
      toast.success("工具已删除")
      setOpen(false)
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={<Button variant="destructive" size="icon-sm" />}
        aria-label={`删除工具 ${tool.name}`}
      >
        <Trash2 />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除工具？</AlertDialogTitle>
          <AlertDialogDescription>
            将永久删除“{tool.name}”的配置和 Function Calling
            定义。依赖该工具的 Agent 将无法继续调用它，此操作不可撤销。
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
