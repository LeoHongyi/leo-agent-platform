"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LoaderCircle, Pencil, Plus } from "lucide-react"
import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toolsApi } from "@/features/tools/api"
import {
  parseJsonObject,
  stringifyJson,
  toolConfigHints,
  toolTypeOptions,
} from "@/features/tools/constants"
import {
  toolFormSchema,
  type Tool,
  type ToolFormInput,
  type ToolFunctionDefinition,
} from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

export function ToolFormDialog({ tool }: { tool?: Tool }) {
  const editing = Boolean(tool)
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<ToolFormInput>({
    resolver: zodResolver(toolFormSchema),
    defaultValues: {
      name: tool?.name ?? "",
      description: tool?.description ?? "",
      type: tool?.type ?? "http_api",
      config_json: stringifyJson(tool?.config ?? null),
      function_name: tool?.function_definition?.name ?? "",
      function_description:
        tool?.function_definition?.description ?? "",
      parameters_json: stringifyJson(
        tool?.function_definition?.parameters ?? null,
      ),
    },
  })
  const selectedType = useWatch({
    control: form.control,
    name: "type",
  })
  const mutation = useMutation({
    mutationFn: (value: ToolFormInput) => {
      const functionDefinition: ToolFunctionDefinition | null =
        value.function_name
          ? {
              name: value.function_name,
              description: value.function_description,
              parameters: parseJsonObject(value.parameters_json) ?? {},
            }
          : null
      const input = {
        name: value.name,
        description: value.description || null,
        type: value.type,
        config: parseJsonObject(value.config_json),
        function_definition: functionDefinition,
      }

      return tool
        ? toolsApi.update(tool.id, input)
        : toolsApi.create(input)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.tools.all,
      })
      toast.success(editing ? "工具已更新" : "工具注册成功")
      setOpen(false)
      if (!editing) form.reset()
    },
    onError: (error) => toast.error(error.message),
  })

  const fieldSuffix = tool?.id ?? "new"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={editing ? "outline" : "default"}
            size={editing ? "icon-sm" : "default"}
            className="w-fit"
          />
        }
        aria-label={editing ? `编辑工具 ${tool?.name}` : undefined}
      >
        {editing ? <Pencil /> : <Plus />}
        {editing ? null : "注册工具"}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑工具" : "注册工具"}</DialogTitle>
          <DialogDescription>
            工具默认以禁用状态创建。请先保存并测试配置，确认正常后再启用。
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-5"
          onSubmit={form.handleSubmit((value) => mutation.mutate(value))}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="工具名称"
              htmlFor={`tool-name-${fieldSuffix}`}
              error={form.formState.errors.name?.message}
            >
              <Input
                id={`tool-name-${fieldSuffix}`}
                aria-invalid={Boolean(form.formState.errors.name)}
                placeholder="例如 查询订单状态"
                {...form.register("name")}
              />
            </FormField>
            <FormField
              label="工具类型"
              htmlFor={`tool-type-${fieldSuffix}`}
              error={form.formState.errors.type?.message}
            >
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      if (value) field.onChange(value)
                    }}
                  >
                    <SelectTrigger
                      id={`tool-type-${fieldSuffix}`}
                      className="w-full"
                      aria-invalid={Boolean(form.formState.errors.type)}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {toolTypeOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>

          <FormField
            label="描述"
            htmlFor={`tool-description-${fieldSuffix}`}
            error={form.formState.errors.description?.message}
          >
            <Textarea
              id={`tool-description-${fieldSuffix}`}
              rows={3}
              placeholder="说明工具的用途、使用条件和返回内容"
              {...form.register("description")}
            />
          </FormField>

          <FormField
            label="运行配置（JSON）"
            htmlFor={`tool-config-${fieldSuffix}`}
            error={form.formState.errors.config_json?.message}
            hint={toolConfigHints[selectedType]}
          >
            <Textarea
              id={`tool-config-${fieldSuffix}`}
              className="min-h-36 font-mono text-xs"
              spellCheck={false}
              aria-invalid={Boolean(form.formState.errors.config_json)}
              placeholder={
                selectedType === "http_api"
                  ? '{\n  "url": "https://api.example.com/tool",\n  "method": "POST",\n  "headers": {},\n  "timeout_seconds": 10\n}'
                  : "{}"
              }
              {...form.register("config_json")}
            />
          </FormField>

          <fieldset className="grid gap-4 rounded-lg border p-4">
            <legend className="px-1 text-sm font-medium">
              Function Calling 定义（可选）
            </legend>
            <p className="text-xs text-muted-foreground">
              提供给模型的函数名称、说明和 JSON Schema。填写任意一项后，三项都必须完整。
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="函数名称"
                htmlFor={`tool-function-name-${fieldSuffix}`}
                error={form.formState.errors.function_name?.message}
              >
                <Input
                  id={`tool-function-name-${fieldSuffix}`}
                  placeholder="get_order_status"
                  {...form.register("function_name")}
                />
              </FormField>
              <FormField
                label="函数说明"
                htmlFor={`tool-function-description-${fieldSuffix}`}
                error={
                  form.formState.errors.function_description?.message
                }
              >
                <Input
                  id={`tool-function-description-${fieldSuffix}`}
                  placeholder="根据订单号查询当前状态"
                  {...form.register("function_description")}
                />
              </FormField>
            </div>
            <FormField
              label="参数 Schema（JSON）"
              htmlFor={`tool-parameters-${fieldSuffix}`}
              error={form.formState.errors.parameters_json?.message}
            >
              <Textarea
                id={`tool-parameters-${fieldSuffix}`}
                className="min-h-36 font-mono text-xs"
                spellCheck={false}
                placeholder={'{\n  "type": "object",\n  "properties": {}\n}'}
                {...form.register("parameters_json")}
              />
            </FormField>
          </fieldset>

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
              ) : null}
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
