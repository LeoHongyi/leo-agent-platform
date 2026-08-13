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
import type { KnowledgeDocument } from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

export function DeleteDocumentDialog({
  knowledgeBaseId,
  document,
}: {
  knowledgeBaseId: number
  document: KnowledgeDocument
}) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => knowledgeBasesApi.removeDocument(knowledgeBaseId, document.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeBases.all })
      toast.success("文档已删除")
      setOpen(false)
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="destructive"
            size="icon-sm"
            disabled={document.status === "processing"}
          />
        }
        aria-label={`删除文档 ${document.file_name}`}
      >
        <Trash2 />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除文档？</AlertDialogTitle>
          <AlertDialogDescription>
            将永久删除“{document.file_name}”的原文件和 {document.segment_count} 个分段，此操作不可撤销。
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
