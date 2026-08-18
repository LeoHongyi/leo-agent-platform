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
import type { KnowledgeSegment } from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

export function DeleteSegmentDialog({
  knowledgeBaseId,
  segment,
  disabled = false,
}: {
  knowledgeBaseId: number
  segment: KnowledgeSegment
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => knowledgeBasesApi.removeSegment(knowledgeBaseId, segment.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeBases.all })
      toast.success("分段已删除")
      setOpen(false)
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={<Button variant="destructive" size="icon-sm" disabled={disabled} />}
        aria-label={`删除分段 ${segment.id}`}
      >
        <Trash2 />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除分段？</AlertDialogTitle>
          <AlertDialogDescription>
            分段 #{segment.id} 将从文档 #{segment.document_id} 的检索结果中永久移除，此操作不可撤销。
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
