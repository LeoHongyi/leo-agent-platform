"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LoaderCircle, Pencil, Plus } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
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
import { Textarea } from "@/components/ui/textarea"
import { modelsApi } from "@/features/models/api"
import {
  modelStatusOptions,
  parseCapabilities,
} from "@/features/models/constants"
import {
  modelFormSchema,
  type Model,
  type ModelFormInput,
  type Provider,
} from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

export function ModelFormDialog({
  model,
  providers,
}: {
  model?: Model
  providers: Provider[]
}) {
  const editing = Boolean(model)
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<ModelFormInput>({
    resolver: zodResolver(modelFormSchema),
    defaultValues: {
      name: model?.name ?? "",
      model_id: model?.model_id ?? "",
      provider_id: model?.provider_id ?? providers[0]?.id ?? 0,
      capabilities: model?.capabilities.join(", ") ?? "",
      context_length: model?.context_length ?? 4096,
      status: model?.status ?? "available",
      input_price: model?.input_price ?? 0,
      output_price: model?.output_price ?? 0,
      currency: model?.currency ?? "USD",
      is_default: model?.is_default ?? false,
      description: model?.description ?? "",
    },
  })
  const mutation = useMutation({
    mutationFn: (value: ModelFormInput) => {
      const common = {
        name: value.name,
        capabilities: parseCapabilities(value.capabilities),
        context_length: value.context_length,
        input_price: value.input_price,
        output_price: value.output_price,
        currency: value.currency.toUpperCase(),
        is_default: value.is_default,
        description: value.description || null,
      }
      if (model) {
        return modelsApi.update(model.id, {
          ...common,
          status: value.status,
        })
      }
      return modelsApi.create({
        ...common,
        model_id: value.model_id,
        provider_id: value.provider_id,
      })
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.models.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.providers.all,
        }),
      ])
      toast.success(editing ? "模型已更新" : "模型添加成功")
      setOpen(false)
      if (!editing) form.reset()
    },
    onError: (error) => toast.error(error.message),
  })
  const unavailable = !editing && providers.length === 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={editing ? "outline" : "default"}
            size={editing ? "sm" : "default"}
            className="w-fit"
            disabled={unavailable}
            title={unavailable ? "请先创建模型供应商" : undefined}
          />
        }
      >
        {editing ? <Pencil /> : <Plus />}
        {editing ? "编辑" : "添加模型"}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑模型" : "添加模型"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "模型标识和所属供应商创建后不可修改。"
              : "模型标识应与供应商 API 使用的模型 ID 保持一致。"}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit((value) => mutation.mutate(value))}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="模型名称"
              htmlFor={`model-name-${model?.id ?? "new"}`}
              error={form.formState.errors.name?.message}
            >
              <Input
                id={`model-name-${model?.id ?? "new"}`}
                placeholder="例如 GPT-4o"
                aria-invalid={Boolean(form.formState.errors.name)}
                {...form.register("name")}
              />
            </FormField>
            <FormField
              label="模型标识"
              htmlFor={`model-identifier-${model?.id ?? "new"}`}
              error={form.formState.errors.model_id?.message}
              hint="例如 gpt-4o、claude-sonnet-4"
            >
              <Input
                id={`model-identifier-${model?.id ?? "new"}`}
                readOnly={editing}
                aria-invalid={Boolean(form.formState.errors.model_id)}
                {...form.register("model_id")}
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="所属供应商"
              htmlFor={`model-provider-${model?.id ?? "new"}`}
              error={form.formState.errors.provider_id?.message}
            >
              {editing ? (
                <>
                  <Input
                    id={`model-provider-${model?.id ?? "new"}`}
                    value={model?.provider_name ?? ""}
                    readOnly
                  />
                  <input
                    type="hidden"
                    {...form.register("provider_id", {
                      valueAsNumber: true,
                    })}
                  />
                </>
              ) : (
                <Controller
                  control={form.control}
                  name="provider_id"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : null}
                      onValueChange={(value) => {
                        if (value) field.onChange(Number(value))
                      }}
                    >
                      <SelectTrigger
                        id={`model-provider-${model?.id ?? "new"}`}
                        className="w-full"
                        aria-invalid={Boolean(
                          form.formState.errors.provider_id,
                        )}
                      >
                        <SelectValue placeholder="选择供应商" />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((provider) => (
                          <SelectItem
                            key={provider.id}
                            value={String(provider.id)}
                          >
                            {provider.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </FormField>
            {editing ? (
              <FormField
                label="状态"
                htmlFor={`model-status-${model?.id}`}
                error={form.formState.errors.status?.message}
              >
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        if (value) field.onChange(value)
                      }}
                    >
                      <SelectTrigger
                        id={`model-status-${model?.id}`}
                        className="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {modelStatusOptions.map((option) => (
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
            ) : (
              <FormField
                label="上下文长度"
                htmlFor="model-context-new"
                error={form.formState.errors.context_length?.message}
              >
                <Input
                  id="model-context-new"
                  type="number"
                  min={1}
                  step={1}
                  {...form.register("context_length", {
                    valueAsNumber: true,
                  })}
                />
              </FormField>
            )}
          </div>

          {editing ? (
            <FormField
              label="上下文长度"
              htmlFor={`model-context-${model?.id}`}
              error={form.formState.errors.context_length?.message}
            >
              <Input
                id={`model-context-${model?.id}`}
                type="number"
                min={1}
                step={1}
                {...form.register("context_length", {
                  valueAsNumber: true,
                })}
              />
            </FormField>
          ) : null}

          <FormField
            label="能力标签"
            htmlFor={`model-capabilities-${model?.id ?? "new"}`}
            error={form.formState.errors.capabilities?.message}
            hint="使用英文逗号分隔，例如 chat, vision, function_call"
          >
            <Input
              id={`model-capabilities-${model?.id ?? "new"}`}
              placeholder="chat, vision, function_call"
              {...form.register("capabilities")}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              label="输入价格 / 1K"
              htmlFor={`model-input-price-${model?.id ?? "new"}`}
              error={form.formState.errors.input_price?.message}
            >
              <Input
                id={`model-input-price-${model?.id ?? "new"}`}
                type="number"
                min={0}
                step="0.000001"
                {...form.register("input_price", {
                  valueAsNumber: true,
                })}
              />
            </FormField>
            <FormField
              label="输出价格 / 1K"
              htmlFor={`model-output-price-${model?.id ?? "new"}`}
              error={form.formState.errors.output_price?.message}
            >
              <Input
                id={`model-output-price-${model?.id ?? "new"}`}
                type="number"
                min={0}
                step="0.000001"
                {...form.register("output_price", {
                  valueAsNumber: true,
                })}
              />
            </FormField>
            <FormField
              label="货币"
              htmlFor={`model-currency-${model?.id ?? "new"}`}
              error={form.formState.errors.currency?.message}
            >
              <Input
                id={`model-currency-${model?.id ?? "new"}`}
                className="uppercase"
                maxLength={10}
                {...form.register("currency")}
              />
            </FormField>
          </div>

          <Controller
            control={form.control}
            name="is_default"
            render={({ field }) => (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="设为平台默认模型"
                />
                设为平台默认模型
              </label>
            )}
          />

          <FormField
            label="描述"
            htmlFor={`model-description-${model?.id ?? "new"}`}
            error={form.formState.errors.description?.message}
          >
            <Textarea
              id={`model-description-${model?.id ?? "new"}`}
              rows={3}
              placeholder="记录模型用途或限制"
              {...form.register("description")}
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
              ) : null}
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
