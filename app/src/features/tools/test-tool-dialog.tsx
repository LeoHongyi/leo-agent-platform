"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { FlaskConical, LoaderCircle } from "lucide-react"
import { useState } from "react"
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
import { toolsApi } from "@/features/tools/api"
import { parseJsonObject } from "@/features/tools/constants"
import type { Tool } from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

export function TestToolDialog({ tool }: { tool: Tool }) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("{}")
  const [inputError, setInputError] = useState("")
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (value: Record<string, unknown>) =>
      toolsApi.test(tool.id, { input: value }),
    onSuccess: (result) => {
      if (result.success) toast.success("工具测试成功")
      else toast.error(result.error || "工具测试失败")
    },
    onError: (error) => toast.error(error.message),
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.tools.all,
      })
    },
  })

  function runTest() {
    try {
      const parsed = parseJsonObject(input)
      if (!parsed) {
        setInputError("请输入 JSON 对象")
        return
      }
      setInputError("")
      mutation.mutate(parsed)
    } catch {
      setInputError("请输入有效的 JSON 对象")
    }
  }

  function changeOpen(value: boolean) {
    setOpen(value)
    if (value) {
      setInputError("")
      mutation.reset()
    }
  }

  const result = mutation.data

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" />}
        aria-label={`测试工具 ${tool.name}`}
      >
        <FlaskConical />
        测试
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>测试工具：{tool.name}</DialogTitle>
          <DialogDescription>
            {tool.type === "http_api"
              ? "输入会作为 GET/DELETE 的查询参数，或作为其他 HTTP 方法的 JSON 请求体。"
              : "当前后端只提供 HTTP API 工具的真实执行器；其他类型会返回明确的未配置错误。"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <FormField
            label="测试输入（JSON）"
            htmlFor={`tool-test-input-${tool.id}`}
            error={inputError}
          >
            <Textarea
              id={`tool-test-input-${tool.id}`}
              className="min-h-40 font-mono text-xs"
              spellCheck={false}
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
          </FormField>

          {result ? (
            <section
              className="grid gap-3 rounded-lg border bg-muted/30 p-4"
              aria-live="polite"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={result.success ? "default" : "destructive"}>
                  {result.success ? "测试成功" : "测试失败"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {result.latency_ms} ms
                  {result.status_code
                    ? ` · HTTP ${result.status_code}`
                    : ""}
                </span>
              </div>
              {result.error ? (
                <p className="text-sm text-destructive">{result.error}</p>
              ) : null}
              {result.output ? (
                <pre className="max-h-64 overflow-auto rounded-md bg-background p-3 text-xs">
                  {JSON.stringify(result.output, null, 2)}
                </pre>
              ) : null}
            </section>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            关闭
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={runTest}
          >
            {mutation.isPending ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <FlaskConical />
            )}
            执行测试
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
