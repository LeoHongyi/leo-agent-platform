"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LoaderCircle, Pencil, Plus } from "lucide-react"
import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
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
import { providersApi } from "@/features/providers/api"
import {
  cloudProviderTypes,
  providerEndpointPlaceholders,
  providerTypeOptions,
} from "@/features/providers/constants"
import {
  providerFormSchema,
  type Provider,
  type ProviderFormInput,
} from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

export function ProviderFormDialog({ provider }: { provider?: Provider }) {
  const editing = Boolean(provider)
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<ProviderFormInput>({
    resolver: zodResolver(providerFormSchema),
    defaultValues: {
      name: provider?.name ?? "",
      type: provider?.type ?? "openai",
      endpoint: provider?.endpoint ?? "",
      api_key: "",
      description: provider?.description ?? "",
      clear_api_key: false,
    },
  })
  const selectedType = useWatch({
    control: form.control,
    name: "type",
  })
  const clearApiKey = useWatch({
    control: form.control,
    name: "clear_api_key",
  })
  const mutation = useMutation({
    mutationFn: (value: ProviderFormInput) => {
      const apiKey = value.api_key.trim()
      const common = {
        name: value.name,
        type: value.type,
        endpoint: value.endpoint,
        description: value.description || null,
      }

      if (provider) {
        return providersApi.update(provider.id, {
          ...common,
          ...(value.clear_api_key
            ? { api_key: null }
            : apiKey
              ? { api_key: apiKey }
              : {}),
        })
      }

      return providersApi.create({
        ...common,
        ...(apiKey ? { api_key: apiKey } : {}),
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.providers.all,
      })
      toast.success(editing ? "供应商已更新" : "供应商创建成功")
      setOpen(false)
      if (!editing) form.reset()
    },
    onError: (error) => toast.error(error.message),
  })

  function submit(value: ProviderFormInput) {
    if (
      !editing &&
      cloudProviderTypes.has(value.type) &&
      !value.api_key.trim()
    ) {
      form.setError("api_key", {
        type: "required",
        message: "云模型供应商需要填写 API Key",
      })
      return
    }
    mutation.mutate(value)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
        {editing ? "编辑" : "新建供应商"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? "编辑供应商" : "新建供应商"}
          </DialogTitle>
          <DialogDescription>
            API Key 会由后端加密保存，读取供应商信息时不会返回明文。
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit(submit)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="供应商名称"
              htmlFor={`provider-name-${provider?.id ?? "new"}`}
              error={form.formState.errors.name?.message}
            >
              <Input
                id={`provider-name-${provider?.id ?? "new"}`}
                aria-invalid={Boolean(form.formState.errors.name)}
                placeholder="例如 生产环境 OpenAI"
                {...form.register("name")}
              />
            </FormField>
            <FormField
              label="供应商类型"
              htmlFor={`provider-type-${provider?.id ?? "new"}`}
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
                      id={`provider-type-${provider?.id ?? "new"}`}
                      className="w-full"
                      aria-invalid={Boolean(form.formState.errors.type)}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {providerTypeOptions.map((item) => (
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
            label="API 地址"
            htmlFor={`provider-endpoint-${provider?.id ?? "new"}`}
            error={form.formState.errors.endpoint?.message}
            hint={`示例：${providerEndpointPlaceholders[selectedType]}`}
          >
            <Input
              id={`provider-endpoint-${provider?.id ?? "new"}`}
              type="url"
              aria-invalid={Boolean(form.formState.errors.endpoint)}
              placeholder={providerEndpointPlaceholders[selectedType]}
              {...form.register("endpoint")}
            />
          </FormField>

          <FormField
            label="API Key"
            htmlFor={`provider-api-key-${provider?.id ?? "new"}`}
            error={form.formState.errors.api_key?.message}
            hint={
              editing
                ? "留空则保留当前密钥；填写新值会覆盖当前密钥"
                : cloudProviderTypes.has(selectedType)
                  ? "云模型供应商必填"
                  : "本地或自定义服务可留空"
            }
          >
            <Input
              id={`provider-api-key-${provider?.id ?? "new"}`}
              type="password"
              autoComplete="new-password"
              disabled={clearApiKey}
              aria-invalid={Boolean(form.formState.errors.api_key)}
              placeholder={editing ? "留空保留当前密钥" : "sk-..."}
              {...form.register("api_key")}
            />
          </FormField>

          {editing ? (
            <Controller
              control={form.control}
              name="clear_api_key"
              render={({ field }) => (
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="清除已保存的 API Key"
                  />
                  <span>
                    清除已保存的 API Key
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      清除后需要重新填写密钥才能连接需要鉴权的服务。
                    </span>
                  </span>
                </label>
              )}
            />
          ) : null}

          <FormField
            label="描述"
            htmlFor={`provider-description-${provider?.id ?? "new"}`}
            error={form.formState.errors.description?.message}
          >
            <Textarea
              id={`provider-description-${provider?.id ?? "new"}`}
              rows={3}
              placeholder="记录用途、环境或维护说明"
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
