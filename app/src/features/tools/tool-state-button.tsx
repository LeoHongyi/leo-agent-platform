"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LoaderCircle, Power, PowerOff } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { toolsApi } from "@/features/tools/api"
import type { Tool } from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

export function ToolStateButton({ tool }: { tool: Tool }) {
  const queryClient = useQueryClient()
  const enabled = tool.status === "enabled"
  const mutation = useMutation({
    mutationFn: () =>
      enabled ? toolsApi.disable(tool.id) : toolsApi.enable(tool.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.tools.all,
      })
      toast.success(enabled ? "工具已禁用" : "工具已启用")
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
      aria-label={`${enabled ? "禁用" : "启用"}工具 ${tool.name}`}
    >
      {mutation.isPending ? (
        <LoaderCircle className="animate-spin" />
      ) : enabled ? (
        <PowerOff />
      ) : (
        <Power />
      )}
      {enabled ? "禁用" : "启用"}
    </Button>
  )
}
