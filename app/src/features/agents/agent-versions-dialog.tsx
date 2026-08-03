"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { History, LoaderCircle, RotateCcw } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { agentsApi } from "@/features/agents/api"
import type { Agent, AgentVersion } from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

const publishedAtFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
})

export function AgentVersionsDialog({ agent }: { agent: Agent }) {
  const [open, setOpen] = useState(false)
  const [rollbackTarget, setRollbackTarget] =
    useState<AgentVersion | null>(null)
  const queryClient = useQueryClient()
  const versionsQuery = useQuery({
    queryKey: queryKeys.agents.versions(agent.id),
    queryFn: () => agentsApi.versions(agent.id),
    enabled: open,
  })
  const rollbackMutation = useMutation({
    mutationFn: (versionId: number) =>
      agentsApi.rollback(agent.id, { version_id: versionId }),
    onSuccess: async (rolledBack) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.agents.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.agents.versions(agent.id),
        }),
      ])
      toast.success(`Agent 已回滚到 ${rolledBack.version}`)
      setRollbackTarget(null)
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={<Button variant="outline" size="icon-sm" />}
          disabled={!agent.current_version_id}
          aria-label={`查看 Agent ${agent.name} 版本`}
        >
          <History />
        </DialogTrigger>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{agent.name} · 版本历史</DialogTitle>
            <DialogDescription>
              每个版本保存完整聚合配置。只有未运行状态可以回滚，回滚不会删除后续历史。
            </DialogDescription>
          </DialogHeader>
          {versionsQuery.isPending ? (
            <div className="grid min-h-48 place-items-center">
              <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : null}
          {versionsQuery.error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <p>{versionsQuery.error.message}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => versionsQuery.refetch()}
              >
                重新加载
              </Button>
            </div>
          ) : null}
          {versionsQuery.data?.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              尚未发布任何版本。
            </div>
          ) : null}
          <div className="grid gap-3">
            {versionsQuery.data?.map((version) => (
              <article
                key={version.id}
                className="rounded-xl border bg-muted/15 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">
                        {version.version}
                      </span>
                      {version.is_current ? <Badge>当前版本</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {version.published_by || "未知用户"}
                      {" · "}
                      {version.published_at
                        ? publishedAtFormatter.format(
                            new Date(version.published_at),
                          )
                        : "时间未知"}
                      {" · "}
                      模型 #{version.model_id || "未配置"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      version.is_current ||
                      !["draft", "inactive"].includes(agent.status)
                    }
                    onClick={() => setRollbackTarget(version)}
                  >
                    <RotateCcw />
                    回滚
                  </Button>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {version.changelog || "本次发布未填写变更说明"}
                </p>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <span>Prompt #{version.prompt_id || "无"}</span>
                  <span>
                    知识库 {version.config.rag.knowledgeBaseIds.length} 个
                  </span>
                  <span>工具 {version.config.tools.toolIds.length} 个</span>
                </div>
              </article>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(rollbackTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setRollbackTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认回滚 Agent？</AlertDialogTitle>
            <AlertDialogDescription>
              将“{agent.name}”恢复为 {rollbackTarget?.version} 的完整配置，并保持未运行状态。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={rollbackMutation.isPending || !rollbackTarget}
              onClick={() => {
                if (rollbackTarget) {
                  rollbackMutation.mutate(rollbackTarget.id)
                }
              }}
            >
              {rollbackMutation.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <RotateCcw />
              )}
              确认回滚
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
