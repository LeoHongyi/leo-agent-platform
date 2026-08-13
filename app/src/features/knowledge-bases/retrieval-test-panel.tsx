"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { LoaderCircle, SearchCheck } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { FormField } from "@/components/common/form-field"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { retrievalStrategyOptions } from "@/features/knowledge-bases/constants"
import {
  retrievalTestInputSchema,
  type KnowledgeBase,
  type RetrievalTestInput,
} from "@/lib/api/schemas"

export function RetrievalTestPanel({
  knowledgeBase,
}: {
  knowledgeBase: KnowledgeBase
}) {
  const form = useForm<RetrievalTestInput>({
    resolver: zodResolver(retrievalTestInputSchema),
    defaultValues: {
      query: "",
      strategy:
        knowledgeBase.retrieval_strategy === "semantic"
          ? "keyword"
          : knowledgeBase.retrieval_strategy,
      top_k: knowledgeBase.top_k,
      similarity_threshold: knowledgeBase.similarity_threshold,
    },
  })
  const mutation = useMutation({
    mutationFn: (value: RetrievalTestInput) =>
      knowledgeBasesApi.testRetrieval(knowledgeBase.id, value),
    onError: (error) => toast.error(error.message),
  })

  return (
    <Card className="surface-panel">
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <SearchCheck className="size-5" /> 检索测试
        </CardTitle>
        <CardDescription>
          使用已完成文档快速验证词法检索效果。测试命中会计入分段命中次数。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <form
          className="grid content-start gap-4 rounded-xl border p-4"
          onSubmit={form.handleSubmit((value) => mutation.mutate(value))}
        >
          <FormField
            label="测试问题"
            htmlFor="retrieval-query"
            error={form.formState.errors.query?.message}
          >
            <Textarea
              id="retrieval-query"
              rows={5}
              placeholder="输入想在知识库中检索的问题或关键词"
              {...form.register("query")}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <FormField label="检索策略" htmlFor="retrieval-strategy">
              <Controller
                control={form.control}
                name="strategy"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="retrieval-strategy" className="w-full"><SelectValue /></SelectTrigger>
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
            <FormField
              label="Top K"
              htmlFor="retrieval-top-k"
              error={form.formState.errors.top_k?.message}
            >
              <Input
                id="retrieval-top-k"
                type="number"
                min={1}
                max={20}
                {...form.register("top_k", { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              label="相似度阈值"
              htmlFor="retrieval-threshold"
              error={form.formState.errors.similarity_threshold?.message}
            >
              <Input
                id="retrieval-threshold"
                type="number"
                min={0}
                max={1}
                step="0.05"
                {...form.register("similarity_threshold", { valueAsNumber: true })}
              />
            </FormField>
          </div>
          <p className="text-xs text-muted-foreground">
            语义检索尚未接入向量索引；混合策略当前与关键词策略共用词法候选阶段。
          </p>
          <Button type="submit" className="w-fit" disabled={mutation.isPending}>
            {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <SearchCheck />}
            执行检索
          </Button>
        </form>

        <div className="grid content-start gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">命中结果</h3>
            {mutation.data ? (
              <Badge variant="secondary">{mutation.data.length} 条</Badge>
            ) : null}
          </div>
          {mutation.isPending ? (
            <div className="grid gap-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : mutation.data?.length ? (
            mutation.data.map((result, index) => (
              <article key={`${result.segment_id}-${index}`} className="grid gap-2 rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" title={result.document_name}>
                      {result.document_name}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      segment #{result.segment_id} · 位置 {result.position}
                    </p>
                  </div>
                  <Badge variant="outline">得分 {result.score.toFixed(4)}</Badge>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(2, Math.min(100, result.score * 100))}%` }}
                  />
                </div>
                <p className="line-clamp-5 whitespace-pre-wrap text-sm text-muted-foreground">
                  {result.content}
                </p>
              </article>
            ))
          ) : mutation.data ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              没有分段达到当前阈值，可尝试调低阈值或使用更具体的关键词。
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              输入问题并执行检索后，命中的文档分段会显示在这里。
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
