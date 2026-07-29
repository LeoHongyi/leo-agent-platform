"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  History,
  LoaderCircle,
  RotateCcw,
} from "lucide-react"
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
import { promptsApi } from "@/features/prompts/api"
import type {
  Prompt,
  PromptVersion,
} from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

const publishedAtFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
})

export function PromptVersionsDialog({ prompt }: { prompt: Prompt }) {
  const [open, setOpen] = useState(false)
  const [rollbackTarget, setRollbackTarget] =
    useState<PromptVersion | null>(null)
  const queryClient = useQueryClient()
  const versionsQuery = useQuery({
    queryKey: queryKeys.prompts.versions(prompt.id),
    queryFn: () => promptsApi.versions(prompt.id),
    enabled: open,
  })
  const rollbackMutation = useMutation({
    mutationFn: (versionId: number) =>
      promptsApi.rollback(prompt.id, { version_id: versionId }),
    onSuccess: async (rolledBackPrompt) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.prompts.all,
      })
      toast.success(`已回滚到 ${rolledBackPrompt.version}`)
      setRollbackTarget(null)
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={<Button variant="outline" size="sm" />}
          disabled={!prompt.current_version_id}
        >
          <History />
          版本
        </DialogTrigger>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{prompt.name} · 版本历史</DialogTitle>
            <DialogDescription>
              每个版本保存正文和变量快照。回滚会丢弃当前未发布修改，并切换线上版本。
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
                      {version.is_current ? (
                        <Badge>当前版本</Badge>
                      ) : null}
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
                      {version.variables.length} 个变量
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={version.is_current}
                    onClick={() => setRollbackTarget(version)}
                  >
                    <RotateCcw />
                    回滚
                  </Button>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">
                  {version.changelog || "本次发布未填写变更说明"}
                </p>
                <pre className="mt-3 max-h-36 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-xs leading-5">
                  {version.content}
                </pre>
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
            <AlertDialogTitle>确认回滚版本？</AlertDialogTitle>
            <AlertDialogDescription>
              将“{prompt.name}”回滚到 {rollbackTarget?.version}
              ，当前尚未发布的正文和变量修改会被覆盖。
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
