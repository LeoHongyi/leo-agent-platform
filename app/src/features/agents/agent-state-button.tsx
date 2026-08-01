"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LoaderCircle, Play, RotateCw, Square } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { agentsApi } from "@/features/agents/api"
import type { Agent } from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

export function AgentStateButton({ agent }: { agent: Agent }) {
  const queryClient = useQueryClient()
  const active = agent.status === "active"
  const mutation = useMutation({
    mutationFn: (action: "start" | "stop") =>
      action === "stop"
        ? agentsApi.stop(agent.id)
        : agentsApi.start(agent.id),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.agents.all,
      })
      toast.success(
        updated.status === "active" ? "Agent 已启动" : "Agent 已停止",
      )
    },
    onError: (error) => toast.error(error.message),
  })

  if (agent.status === "draft") return null

  if (agent.status === "error") {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate("start")}
          aria-label={`重新启动 Agent ${agent.name}`}
        >
          {mutation.isPending &&
          mutation.variables === "start" ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <RotateCw />
          )}
          重启
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate("stop")}
          aria-label={`停止异常 Agent ${agent.name}`}
        >
          {mutation.isPending &&
          mutation.variables === "stop" ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Square />
          )}
          停用
        </Button>
      </>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate(active ? "stop" : "start")}
      aria-label={`${active ? "停止" : "启动"} Agent ${agent.name}`}
    >
      {mutation.isPending ? (
        <LoaderCircle className="animate-spin" />
      ) : active ? (
        <Square />
      ) : (
        <Play />
      )}
      {active ? "停止" : "启动"}
    </Button>
  )
}
