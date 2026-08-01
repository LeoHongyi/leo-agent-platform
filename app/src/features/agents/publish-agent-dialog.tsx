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
import { agentsApi } from "@/features/agents/api"
import {
  agentPublishSchema,
  type Agent,
  type AgentPublishInput,
} from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

export function PublishAgentDialog({ agent }: { agent: Agent }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<AgentPublishInput>({
    resolver: zodResolver(agentPublishSchema),
    defaultValues: { changelog: "" },
  })
  const mutation = useMutation({
    mutationFn: (value: AgentPublishInput) =>
      agentsApi.publish(agent.id, value),
    onSuccess: async (published) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.agents.all,
      })
      toast.success(`Agent 已发布 ${published.version}`)
      setOpen(false)
      form.reset()
    },
    onError: (error) => toast.error(error.message),
  })

  if (agent.status === "active" || agent.status === "error") return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant={agent.status === "draft" ? "default" : "outline"}
          />
        }
      >
        <Rocket />
        发布
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {agent.version ? "发布 Agent 新版本" : "首次发布 Agent"}
          </DialogTitle>
          <DialogDescription>
            发布前会校验全部聚合引用和运行状态。首次发布为 v1.0，之后按完整历史递增小版本。
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit((value) => mutation.mutate(value))}
        >
          <FormField
            label="变更说明"
            htmlFor={`agent-changelog-${agent.id}`}
            error={form.formState.errors.changelog?.message}
          >
            <Textarea
              id={`agent-changelog-${agent.id}`}
              rows={4}
              placeholder="描述本次模型、Prompt、RAG 或工具配置变化"
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
