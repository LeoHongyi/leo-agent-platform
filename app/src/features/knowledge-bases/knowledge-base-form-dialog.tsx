"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LoaderCircle, Pencil, Plus } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { knowledgeBasesApi } from "@/features/knowledge-bases/api"
import {
  chunkMethodOptions,
  retrievalStrategyOptions,
} from "@/features/knowledge-bases/constants"
import {
  chunkMethodSchema,
  retrievalStrategySchema,
  type KnowledgeBase,
} from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

const formSchema = z
  .object({
    name: z.string().trim().min(1, "请输入知识库名称").max(200),
    description: z.string().trim().max(500, "描述不能超过 500 个字符"),
    embedding_model: z.string().trim().min(1, "请输入 Embedding 模型").max(100),
    chunk_method: chunkMethodSchema,
    chunk_size: z.number().int().min(100).max(2_000),
    chunk_overlap: z.number().int().min(0).max(500),
    retrieval_strategy: retrievalStrategySchema,
    top_k: z.number().int().min(1).max(20),
    similarity_threshold: z.number().min(0).max(1),
  })
  .superRefine((value, context) => {
    if (value.chunk_overlap >= value.chunk_size) {
      context.addIssue({
        code: "custom",
        path: ["chunk_overlap"],
        message: "重叠大小必须小于分段大小",
      })
    }
  })

type FormInput = z.infer<typeof formSchema>

export function KnowledgeBaseFormDialog({
  knowledgeBase,
  triggerVariant = "labeled",
}: {
  knowledgeBase?: KnowledgeBase
  triggerVariant?: "labeled" | "icon"
}) {
  const editing = Boolean(knowledgeBase)
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: valuesFromKnowledgeBase(knowledgeBase),
  })
  const mutation = useMutation({
    mutationFn: (value: FormInput) =>
      knowledgeBase
        ? knowledgeBasesApi.update(knowledgeBase.id, {
            name: value.name,
            description: value.description || null,
            embedding_model: value.embedding_model,
          })
        : knowledgeBasesApi.create({
            ...value,
            description: value.description || null,
          }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.knowledgeBases.all,
      })
      toast.success(editing ? "知识库已更新" : "知识库已创建")
      setOpen(false)
      if (!editing) form.reset(valuesFromKnowledgeBase())
    },
    onError: (error) => toast.error(error.message),
  })
  const suffix = knowledgeBase?.id ?? "new"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={editing ? "outline" : "default"}
            size={
              editing && triggerVariant === "icon" ? "icon-sm" : "default"
            }
          />
        }
        aria-label={editing ? `编辑知识库 ${knowledgeBase?.name}` : undefined}
      >
        {editing ? <Pencil /> : <Plus />}
        {editing
          ? triggerVariant === "icon"
            ? null
            : "编辑基础信息"
          : "新建知识库"}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑知识库" : "新建知识库"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "基础信息会立即生效，分段和检索参数请在详情页中单独管理。"
              : "配置会应用于后续上传的文档，可在创建后继续调整。"}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit((value) => mutation.mutate(value))}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="名称"
              htmlFor={`kb-name-${suffix}`}
              error={form.formState.errors.name?.message}
            >
              <Input id={`kb-name-${suffix}`} {...form.register("name")} />
            </FormField>
            <FormField
              label="Embedding 模型"
              htmlFor={`kb-embedding-${suffix}`}
              error={form.formState.errors.embedding_model?.message}
            >
              <Input
                id={`kb-embedding-${suffix}`}
                {...form.register("embedding_model")}
              />
            </FormField>
          </div>
          <FormField
            label="描述"
            htmlFor={`kb-description-${suffix}`}
            error={form.formState.errors.description?.message}
          >
            <Textarea
              id={`kb-description-${suffix}`}
              rows={3}
              {...form.register("description")}
            />
          </FormField>

          {!editing ? (
            <fieldset className="grid gap-4 rounded-lg border p-4">
              <legend className="px-1 text-sm font-medium">处理与检索配置</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="分段方式" htmlFor={`kb-chunk-method-${suffix}`}>
                  <Controller
                    control={form.control}
                    name="chunk_method"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id={`kb-chunk-method-${suffix}`} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {chunkMethodOptions.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
                <FormField label="检索策略" htmlFor={`kb-retrieval-${suffix}`}>
                  <Controller
                    control={form.control}
                    name="retrieval_strategy"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id={`kb-retrieval-${suffix}`} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {retrievalStrategyOptions.map((item) => (
                            <SelectItem key={item.value} value={item.value} disabled={item.value === "semantic"}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
                <NumberField form={form} name="chunk_size" label="分段大小" suffix={suffix} />
                <NumberField form={form} name="chunk_overlap" label="重叠大小" suffix={suffix} />
                <NumberField form={form} name="top_k" label="Top K" suffix={suffix} />
                <NumberField
                  form={form}
                  name="similarity_threshold"
                  label="相似度阈值"
                  suffix={suffix}
                  step="0.05"
                />
              </div>
            </fieldset>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <LoaderCircle className="animate-spin" /> : null}
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function NumberField({
  form,
  name,
  label,
  suffix,
  step = "1",
}: {
  form: ReturnType<typeof useForm<FormInput>>
  name: "chunk_size" | "chunk_overlap" | "top_k" | "similarity_threshold"
  label: string
  suffix: string | number
  step?: string
}) {
  return (
    <FormField
      label={label}
      htmlFor={`kb-${name}-${suffix}`}
      error={form.formState.errors[name]?.message}
    >
      <Input
        id={`kb-${name}-${suffix}`}
        type="number"
        step={step}
        {...form.register(name, { valueAsNumber: true })}
      />
    </FormField>
  )
}

function valuesFromKnowledgeBase(knowledgeBase?: KnowledgeBase): FormInput {
  return {
    name: knowledgeBase?.name ?? "",
    description: knowledgeBase?.description ?? "",
    embedding_model: knowledgeBase?.embedding_model ?? "text-embedding-ada-002",
    chunk_method: knowledgeBase?.chunk_method ?? "fixed",
    chunk_size: knowledgeBase?.chunk_size ?? 500,
    chunk_overlap: knowledgeBase?.chunk_overlap ?? 50,
    retrieval_strategy: knowledgeBase?.retrieval_strategy ?? "hybrid",
    top_k: knowledgeBase?.top_k ?? 5,
    similarity_threshold: knowledgeBase?.similarity_threshold ?? 0.7,
  }
}
