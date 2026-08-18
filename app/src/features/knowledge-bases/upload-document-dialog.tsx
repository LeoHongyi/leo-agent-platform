"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { FileUp, LoaderCircle, UploadCloud } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { knowledgeBasesApi } from "@/features/knowledge-bases/api"
import {
  maxKnowledgeFileBytes,
  supportedKnowledgeFileTypes,
} from "@/features/knowledge-bases/constants"
import { queryKeys } from "@/lib/query-keys"

const allowedExtensions = new Set(["txt", "md", "csv", "html", "docx", "pdf"])

export function UploadDocumentDialog({
  knowledgeBaseId,
}: {
  knowledgeBaseId: number
}) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [inputKey, setInputKey] = useState(0)
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (selectedFile: File) =>
      knowledgeBasesApi.uploadDocument(knowledgeBaseId, selectedFile),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.knowledgeBases.all,
      })
      toast.success("文档已上传，后台正在处理")
      setOpen(false)
      setFile(null)
      setInputKey((value) => value + 1)
    },
    onError: (error) => toast.error(error.message),
  })

  function selectFile(selected: File | undefined) {
    if (!selected) {
      setFile(null)
      return
    }
    const extension = selected.name.split(".").pop()?.toLowerCase() ?? ""
    if (!allowedExtensions.has(extension)) {
      toast.error("支持 TXT、MD、CSV、HTML、DOCX 和文本型 PDF")
      setFile(null)
      setInputKey((value) => value + 1)
      return
    }
    if (selected.size > maxKnowledgeFileBytes) {
      toast.error("文件大小不能超过 20 MB")
      setFile(null)
      setInputKey((value) => value + 1)
      return
    }
    setFile(selected)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <FileUp /> 上传文档
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>上传文档</DialogTitle>
          <DialogDescription>
            单文件最大 20 MB。上传后会由后台解析和分段，列表会自动刷新处理状态。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 rounded-xl border border-dashed p-5 text-center">
          <UploadCloud className="mx-auto size-8 text-muted-foreground" />
          <Label htmlFor="knowledge-document" className="justify-center">
            选择要上传的文档
          </Label>
          <Input
            key={inputKey}
            id="knowledge-document"
            type="file"
            accept={supportedKnowledgeFileTypes}
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
          <p className="text-xs text-muted-foreground">
            TXT、MD、CSV、HTML、DOCX、文本型 PDF
          </p>
          {file ? (
            <p className="rounded-lg bg-muted p-2 text-sm">
              {file.name} · {formatFileSize(file.size)}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            disabled={!file || mutation.isPending}
            onClick={() => file && mutation.mutate(file)}
          >
            {mutation.isPending ? <LoaderCircle className="animate-spin" /> : null}
            开始上传
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
