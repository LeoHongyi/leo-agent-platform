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
import { knowledgeBasesApi } from "@/features/knowledge-bases/api"
import type { KnowledgeBase } from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

export function DeleteKnowledgeBaseDialog({
  knowledgeBase,
}: {
  knowledgeBase: KnowledgeBase
}) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => knowledgeBasesApi.remove(knowledgeBase.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.knowledgeBases.all,
      })
      toast.success("知识库已删除")
      setOpen(false)
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={<Button variant="destructive" size="icon-sm" />}
        aria-label={`删除知识库 ${knowledgeBase.name}`}
      >
        <Trash2 />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除知识库？</AlertDialogTitle>
          <AlertDialogDescription>
            将永久删除“{knowledgeBase.name}”、{knowledgeBase.document_count} 份文档及所有分段。
            如果它正被 Agent 使用，后端会拒绝删除。此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <LoaderCircle className="animate-spin" /> : null}
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
