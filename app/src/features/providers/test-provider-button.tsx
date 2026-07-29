"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LoaderCircle, PlugZap } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { providersApi } from "@/features/providers/api"
import type { Provider } from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

export function TestProviderButton({ provider }: { provider: Provider }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => providersApi.testConnection(provider.id),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.providers.all,
      })
      const status = result.status_code
        ? `，HTTP ${result.status_code}`
        : ""
      const message = `${result.message}（${result.latency_ms} ms${status}）`
      if (result.success) toast.success(message)
      else toast.error(message)
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
      aria-label={`测试供应商 ${provider.name} 的连接`}
    >
      {mutation.isPending ? (
        <LoaderCircle className="animate-spin" />
      ) : (
        <PlugZap />
      )}
      测试
    </Button>
  )
}
