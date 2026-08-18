"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LoaderCircle, Pencil } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

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
import { knowledgeBasesApi } from "@/features/knowledge-bases/api"
import type { KnowledgeSegment } from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

const formSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "分段内容不能为空")
    .max(16_000, "分段内容不能超过 16000 个字符"),
  keywords: z.string().max(5_000),
})

type FormInput = z.infer<typeof formSchema>

export function SegmentFormDialog({
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
  const form = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: segment.content,
      keywords: segment.keywords?.join(", ") ?? "",
    },
  })
  const mutation = useMutation({
    mutationFn: (value: FormInput) =>
      knowledgeBasesApi.updateSegment(knowledgeBaseId, segment.id, {
        content: value.content,
        keywords: normalizeKeywords(value.keywords),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeBases.all })
      toast.success("分段已更新")
      setOpen(false)
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="icon-sm" disabled={disabled} />}
        aria-label={`编辑分段 ${segment.id}`}
      >
        <Pencil />
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>编辑分段 #{segment.id}</DialogTitle>
          <DialogDescription>
            修改内容后会重新计算字数和 token 数。只有已完成文档的分段可编辑。
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit((value) => mutation.mutate(value))}
        >
          <FormField
            label="分段内容"
            htmlFor={`segment-content-${segment.id}`}
            error={form.formState.errors.content?.message}
          >
            <Textarea
              id={`segment-content-${segment.id}`}
              className="min-h-64"
              {...form.register("content")}
            />
          </FormField>
          <FormField
            label="关键词"
            htmlFor={`segment-keywords-${segment.id}`}
            error={form.formState.errors.keywords?.message}
            hint="用中文或英文逗号分隔，重复值会自动去除"
          >
            <Input
              id={`segment-keywords-${segment.id}`}
              placeholder="RAG, 检索, Agent"
              {...form.register("keywords")}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <LoaderCircle className="animate-spin" /> : null}
              保存分段
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function normalizeKeywords(value: string) {
  const values = value
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean)
  return [...new Set(values)]
}
