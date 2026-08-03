"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Bot, LoaderCircle, Play } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { FormField } from "@/components/common/form-field"
import { Badge } from "@/components/ui/badge"
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
  agentInvokeFormSchema,
  type Agent,
  type AgentInvokeFormInput,
  type AgentInvokeResult,
} from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

type AgentVariable = string | number | boolean

export function InvokeAgentDialog({ agent }: { agent: Agent }) {
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<AgentInvokeResult | null>(null)
  const queryClient = useQueryClient()
  const form = useForm<AgentInvokeFormInput>({
    resolver: zodResolver(agentInvokeFormSchema),
    defaultValues: {
      input: "",
      variables_json: "{}",
    },
  })
  const mutation = useMutation({
    mutationFn: (value: AgentInvokeFormInput) =>
      agentsApi.invoke(agent.id, {
        input: value.input,
        history: [],
        variables: parseVariables(value.variables_json),
      }),
    onSuccess: (response) => {
      setResult(response)
      toast.success("Agent 调用成功")
    },
    onError: (error) => {
      setResult(null)
      toast.error(error.message)
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.agents.all,
      })
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setResult(null)
      }}
    >
      <DialogTrigger
        render={<Button size="sm" disabled={agent.status !== "active"} />}
      >
        <Play />
        调用
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>调用 {agent.name}</DialogTitle>
          <DialogDescription>
            请求会发送到 Agent 当前模型 Provider，并更新近 7 日运行统计。运行异常会把 Agent
            置为 error。
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit((value) => mutation.mutate(value))}
        >
          <FormField
            label="用户消息"
            htmlFor={`agent-input-${agent.id}`}
            error={form.formState.errors.input?.message}
          >
            <Textarea
              id={`agent-input-${agent.id}`}
              rows={5}
              placeholder="输入要发送给 Agent 的消息"
              {...form.register("input")}
            />
          </FormField>
          <FormField
            label="Prompt 变量（JSON）"
            htmlFor={`agent-variables-${agent.id}`}
            error={form.formState.errors.variables_json?.message}
            hint='例如 {"customer":"Leo"}；值仅支持字符串、数字和布尔值'
          >
            <Textarea
              id={`agent-variables-${agent.id}`}
              className="min-h-28 font-mono text-xs"
              spellCheck={false}
              {...form.register("variables_json")}
            />
          </FormField>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              关闭
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Play />
              )}
              发送
            </Button>
          </DialogFooter>
        </form>

        {result ? (
          <section className="grid gap-3 rounded-xl border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Bot className="size-4" />
              <span className="font-medium">调用结果</span>
              <Badge variant="secondary">{result.model_id}</Badge>
              <Badge variant="outline">{result.latency_ms} ms</Badge>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6">
              {result.content || "模型未返回文本内容"}
            </p>
            {result.tool_calls.length > 0 ? (
              <pre className="max-h-52 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs">
                {JSON.stringify(result.tool_calls, null, 2)}
              </pre>
            ) : null}
            {result.usage ? (
              <p className="font-mono text-xs text-muted-foreground">
                usage: {JSON.stringify(result.usage)}
              </p>
            ) : null}
          </section>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function parseVariables(value: string): Record<string, AgentVariable> {
  return JSON.parse(value || "{}") as Record<string, AgentVariable>
}
