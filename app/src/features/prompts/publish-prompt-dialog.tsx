"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LoaderCircle, Rocket } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
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
import { Textarea } from "@/components/ui/textarea"
import { promptsApi } from "@/features/prompts/api"
import {
  promptPublishSchema,
  type Prompt,
  type PromptPublishInput,
} from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

export function PublishPromptDialog({ prompt }: { prompt: Prompt }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<PromptPublishInput>({
    resolver: zodResolver(promptPublishSchema),
    defaultValues: { changelog: "" },
  })
  const mutation = useMutation({
    mutationFn: (value: PromptPublishInput) =>
      promptsApi.publish(prompt.id, value),
    onSuccess: async (publishedPrompt) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.prompts.all,
      })
      toast.success(`已发布 ${publishedPrompt.version}`)
      setOpen(false)
      form.reset()
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant={prompt.status === "draft" ? "default" : "outline"}
          />
        }
      >
        <Rocket />
        发布
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {prompt.version ? "发布新版本" : "首次发布 Prompt"}
          </DialogTitle>
          <DialogDescription>
            {prompt.version
              ? `当前线上版本为 ${prompt.version}。发布后将创建新的正文和变量快照。`
              : "首次发布会创建 v1.0，并将当前草稿设为线上版本。"}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit((value) => mutation.mutate(value))}
        >
          <FormField
            label="变更说明"
            htmlFor={`prompt-changelog-${prompt.id}`}
            error={form.formState.errors.changelog?.message}
            hint="可选，最多 500 个字符"
          >
            <Textarea
              id={`prompt-changelog-${prompt.id}`}
              rows={4}
              placeholder="描述本次调整内容"
              {...form.register("changelog")}
            />
          </FormField>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Rocket />
              )}
              确认发布
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
