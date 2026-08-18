"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LoaderCircle, Settings2 } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { knowledgeBasesApi } from "@/features/knowledge-bases/api"
import {
  chunkMethodOptions,
  retrievalStrategyOptions,
} from "@/features/knowledge-bases/constants"
import {
  knowledgeBaseConfigSchema,
  type KnowledgeBase,
  type KnowledgeBaseConfigInput,
} from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

export function KnowledgeBaseConfigDialog({
  knowledgeBase,
}: {
  knowledgeBase: KnowledgeBase
}) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<KnowledgeBaseConfigInput>({
    resolver: zodResolver(knowledgeBaseConfigSchema),
    defaultValues: {
      embedding_model: knowledgeBase.embedding_model,
      chunk_method: knowledgeBase.chunk_method,
      chunk_size: knowledgeBase.chunk_size,
      chunk_overlap: knowledgeBase.chunk_overlap,
      retrieval_strategy: knowledgeBase.retrieval_strategy,
      top_k: knowledgeBase.top_k,
      similarity_threshold: knowledgeBase.similarity_threshold,
    },
  })
  const mutation = useMutation({
    mutationFn: (value: KnowledgeBaseConfigInput) =>
      knowledgeBasesApi.updateConfig(knowledgeBase.id, value),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.knowledgeBases.all,
      })
      toast.success("知识库配置已更新")
      setOpen(false)
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Settings2 /> 处理配置
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>处理与检索配置</DialogTitle>
          <DialogDescription>
            更改仅影响后续处理。如需让已完成文档使用新分段策略，请在文档列表中重试。
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit((value) => mutation.mutate(value))}
        >
          <FormField
            label="Embedding 模型"
            htmlFor="kb-config-embedding"
            error={form.formState.errors.embedding_model?.message}
          >
            <Input id="kb-config-embedding" {...form.register("embedding_model")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="分段方式" htmlFor="kb-config-chunk-method">
              <Controller
                control={form.control}
                name="chunk_method"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="kb-config-chunk-method" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {chunkMethodOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="检索策略" htmlFor="kb-config-retrieval">
              <Controller
                control={form.control}
                name="retrieval_strategy"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="kb-config-retrieval" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {retrievalStrategyOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value} disabled={item.value === "semantic"}>{item.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            {([
              ["chunk_size", "分段大小", "1"],
              ["chunk_overlap", "重叠大小", "1"],
              ["top_k", "Top K", "1"],
              ["similarity_threshold", "相似度阈值", "0.05"],
            ] as const).map(([name, label, step]) => (
              <FormField
                key={name}
                label={label}
                htmlFor={`kb-config-${name}`}
                error={form.formState.errors[name]?.message}
              >
                <Input
                  id={`kb-config-${name}`}
                  type="number"
                  step={step}
                  {...form.register(name, { valueAsNumber: true })}
                />
              </FormField>
            ))}
          </div>
          <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            语义检索尚未接入向量索引，直接调用会返回业务错误 43011；混合策略当前使用词法候选阶段。
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <LoaderCircle className="animate-spin" /> : null}
              保存配置
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
