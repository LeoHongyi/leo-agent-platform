"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Braces,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { useState } from "react"
import {
  Controller,
  useFieldArray,
  useForm,
} from "react-hook-form"
import { toast } from "sonner"

import { FormField } from "@/components/common/form-field"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { promptsApi } from "@/features/prompts/api"
import {
  parsePromptTags,
  promptVariableTypeOptions,
} from "@/features/prompts/constants"
import {
  promptFormSchema,
  type Prompt,
  type PromptFormInput,
} from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

const emptyVariable: PromptFormInput["variables"][number] = {
  name: "",
  type: "string",
  description: "",
  default_value: "",
  required: true,
}

function promptFormValues(prompt?: Prompt): PromptFormInput {
  return {
    name: prompt?.name ?? "",
    description: prompt?.description ?? "",
    category: prompt?.category ?? "general",
    tags: prompt?.tags.join(", ") ?? "",
    content: prompt?.content ?? "",
    variables:
      prompt?.variables.map((variable) => ({
        ...variable,
        default_value: variable.default_value ?? "",
      })) ?? [],
  }
}

export function PromptFormDialog({ prompt }: { prompt?: Prompt }) {
  const editing = Boolean(prompt)
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<PromptFormInput>({
    resolver: zodResolver(promptFormSchema),
    defaultValues: promptFormValues(prompt),
  })
  const variables = useFieldArray({
    control: form.control,
    name: "variables",
  })
  const mutation = useMutation({
    mutationFn: (value: PromptFormInput) => {
      const payload = {
        name: value.name,
        description: value.description.trim() || null,
        category: value.category,
        tags: parsePromptTags(value.tags),
        content: value.content,
        variables: value.variables.map((variable) => ({
          ...variable,
          default_value: variable.default_value.trim() || null,
        })),
      }

      return prompt
        ? promptsApi.update(prompt.id, payload)
        : promptsApi.create(payload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.prompts.all,
      })
      toast.success(editing ? "Prompt 已更新" : "Prompt 创建成功")
      setOpen(false)
      if (!editing) form.reset(promptFormValues())
    },
    onError: (error) => toast.error(error.message),
  })

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) {
      form.reset(promptFormValues(prompt))
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger
        render={
          <Button
            variant={editing ? "outline" : "default"}
            size={editing ? "sm" : "default"}
            className="w-fit"
          />
        }
      >
        {editing ? <Pencil /> : <Plus />}
        {editing ? "编辑" : "新建 Prompt"}
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? "编辑 Prompt" : "新建 Prompt"}
          </DialogTitle>
          <DialogDescription>
            修改正文或变量后会进入草稿状态，只有再次发布才会生成新的不可变版本。
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-5"
          onSubmit={form.handleSubmit((value) => mutation.mutate(value))}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="名称"
              htmlFor={`prompt-name-${prompt?.id ?? "new"}`}
              error={form.formState.errors.name?.message}
            >
              <Input
                id={`prompt-name-${prompt?.id ?? "new"}`}
                placeholder="例如 客服回复生成器"
                aria-invalid={Boolean(form.formState.errors.name)}
                {...form.register("name")}
              />
            </FormField>
            <FormField
              label="分类"
              htmlFor={`prompt-category-${prompt?.id ?? "new"}`}
              error={form.formState.errors.category?.message}
            >
              <Input
                id={`prompt-category-${prompt?.id ?? "new"}`}
                placeholder="例如 customer-service"
                aria-invalid={Boolean(form.formState.errors.category)}
                {...form.register("category")}
              />
            </FormField>
          </div>

          <FormField
            label="描述"
            htmlFor={`prompt-description-${prompt?.id ?? "new"}`}
            error={form.formState.errors.description?.message}
          >
            <Textarea
              id={`prompt-description-${prompt?.id ?? "new"}`}
              rows={2}
              placeholder="说明用途、适用场景或维护约束"
              {...form.register("description")}
            />
          </FormField>

          <FormField
            label="标签"
            htmlFor={`prompt-tags-${prompt?.id ?? "new"}`}
            error={form.formState.errors.tags?.message}
            hint="使用英文逗号分隔，重复标签会自动去重"
          >
            <Input
              id={`prompt-tags-${prompt?.id ?? "new"}`}
              placeholder="客服, 中文, 生产环境"
              {...form.register("tags")}
            />
          </FormField>

          <FormField
            label="Prompt 内容"
            htmlFor={`prompt-content-${prompt?.id ?? "new"}`}
            error={form.formState.errors.content?.message}
            hint="变量可使用 {variable_name} 形式嵌入正文"
          >
            <Textarea
              id={`prompt-content-${prompt?.id ?? "new"}`}
              rows={12}
              className="font-mono text-sm leading-6"
              placeholder="你是一名专业客服。请根据 {topic} 回复用户……"
              aria-invalid={Boolean(form.formState.errors.content)}
              {...form.register("content")}
            />
          </FormField>

          <Separator />

          <section className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 font-medium">
                  <Braces className="size-4" />
                  变量定义
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  发布时正文和变量会一起保存为版本快照。
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={variables.fields.length >= 100}
                onClick={() => variables.append({ ...emptyVariable })}
              >
                <Plus />
                添加变量
              </Button>
            </div>

            {variables.fields.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                当前 Prompt 没有变量。
              </div>
            ) : null}

            {variables.fields.map((variableField, index) => {
              const variableErrors =
                form.formState.errors.variables?.[index]
              return (
                <div
                  key={variableField.id}
                  className="grid gap-3 rounded-xl border bg-muted/20 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      变量 {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`删除变量 ${index + 1}`}
                      onClick={() => variables.remove(index)}
                    >
                      <Trash2 />
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      label="变量名"
                      htmlFor={`prompt-variable-name-${prompt?.id ?? "new"}-${index}`}
                      error={variableErrors?.name?.message}
                    >
                      <Input
                        id={`prompt-variable-name-${prompt?.id ?? "new"}-${index}`}
                        placeholder="topic"
                        {...form.register(`variables.${index}.name`)}
                      />
                    </FormField>
                    <FormField
                      label="类型"
                      htmlFor={`prompt-variable-type-${prompt?.id ?? "new"}-${index}`}
                      error={variableErrors?.type?.message}
                    >
                      <Controller
                        control={form.control}
                        name={`variables.${index}.type`}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              if (value) field.onChange(value)
                            }}
                          >
                            <SelectTrigger
                              id={`prompt-variable-type-${prompt?.id ?? "new"}-${index}`}
                              className="w-full"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {promptVariableTypeOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </FormField>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      label="说明"
                      htmlFor={`prompt-variable-description-${prompt?.id ?? "new"}-${index}`}
                      error={variableErrors?.description?.message}
                    >
                      <Input
                        id={`prompt-variable-description-${prompt?.id ?? "new"}-${index}`}
                        placeholder="变量用途"
                        {...form.register(
                          `variables.${index}.description`,
                        )}
                      />
                    </FormField>
                    <FormField
                      label="默认值"
                      htmlFor={`prompt-variable-default-${prompt?.id ?? "new"}-${index}`}
                      error={variableErrors?.default_value?.message}
                    >
                      <Input
                        id={`prompt-variable-default-${prompt?.id ?? "new"}-${index}`}
                        placeholder="可选"
                        {...form.register(
                          `variables.${index}.default_value`,
                        )}
                      />
                    </FormField>
                  </div>

                  <Controller
                    control={form.control}
                    name={`variables.${index}.required`}
                    render={({ field }) => (
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          aria-label={`变量 ${index + 1} 是否必填`}
                        />
                        必填变量
                      </label>
                    )}
                  />
                </div>
              )
            })}
          </section>

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
