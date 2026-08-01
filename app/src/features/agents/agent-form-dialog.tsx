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
import { agentsApi } from "@/features/agents/api"
import {
  agentTypeOptions,
  retrievalStrategyOptions,
} from "@/features/agents/constants"
import {
  agentFormSchema,
  type Agent,
  type AgentCreateInput,
  type AgentFormInput,
  type KnowledgeBase,
  type Model,
  type Prompt,
  type Tool,
} from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"

type AgentFormDialogProps = {
  agent?: Agent
  models: Model[]
  prompts: Prompt[]
  knowledgeBases: KnowledgeBase[]
  tools: Tool[]
}

export function AgentFormDialog({
  agent,
  models,
  prompts,
  knowledgeBases,
  tools,
}: AgentFormDialogProps) {
  const editing = Boolean(agent)
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<AgentFormInput>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: agentFormDefaults(agent),
  })
  const ragEnabled = useWatch({
    control: form.control,
    name: "rag_enabled",
  })
  const toolsEnabled = useWatch({
    control: form.control,
    name: "tools_enabled",
  })
  const mutation = useMutation({
    mutationFn: (value: AgentFormInput) => {
      const payload = toAgentPayload(value, models)
      return agent
        ? agentsApi.update(agent.id, payload)
        : agentsApi.create(payload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.agents.all,
      })
      toast.success(editing ? "Agent 已更新为草稿" : "Agent 草稿已创建")
      setOpen(false)
      if (!editing) form.reset(agentFormDefaults())
    },
    onError: (error) => toast.error(error.message),
  })
  const suffix = agent?.id ?? "new"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={editing ? "outline" : "default"}
            size={editing ? "icon-sm" : "default"}
            className="w-fit"
            disabled={agent?.status === "active"}
          />
        }
        aria-label={editing ? `编辑 Agent ${agent?.name}` : undefined}
      >
        {editing ? <Pencil /> : <Plus />}
        {editing ? null : "创建 Agent"}
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑 Agent" : "创建 Agent"}</DialogTitle>
          <DialogDescription>
            保存后为草稿；发布时会校验模型、Provider、Prompt、知识库和工具状态。
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-5"
          onSubmit={form.handleSubmit((value) => mutation.mutate(value))}
        >
          <fieldset className="grid gap-4 rounded-xl border p-4">
            <legend className="px-1 text-sm font-semibold">基础信息</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                label="Agent 名称"
                htmlFor={`agent-name-${suffix}`}
                error={form.formState.errors.name?.message}
              >
                <Input
                  id={`agent-name-${suffix}`}
                  placeholder="智能客服 Agent"
                  {...form.register("name")}
                />
              </FormField>
              <FormField
                label="类型"
                htmlFor={`agent-type-${suffix}`}
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
                      <SelectTrigger id={`agent-type-${suffix}`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {agentTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField
                label="平台模型"
                htmlFor={`agent-model-${suffix}`}
                error={form.formState.errors.model_id?.message}
                hint="可先不选，但未配置模型无法发布"
              >
                <Controller
                  control={form.control}
                  name="model_id"
                  render={({ field }) => (
                    <Select
                      value={String(field.value)}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <SelectTrigger id={`agent-model-${suffix}`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">暂不选择</SelectItem>
                        {models.map((model) => (
                          <SelectItem key={model.id} value={String(model.id)}>
                            {model.name} · {model.provider_name}
                            {model.status === "available" ? "" : "（不可用）"}
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
              htmlFor={`agent-description-${suffix}`}
              error={form.formState.errors.description?.message}
            >
              <Textarea
                id={`agent-description-${suffix}`}
                rows={3}
                placeholder="说明 Agent 的职责、使用范围和限制"
                {...form.register("description")}
              />
            </FormField>
          </fieldset>

          <fieldset className="grid gap-4 rounded-xl border p-4">
            <legend className="px-1 text-sm font-semibold">模型参数</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                label="Temperature"
                htmlFor={`agent-temperature-${suffix}`}
                error={form.formState.errors.temperature?.message}
              >
                <Input
                  id={`agent-temperature-${suffix}`}
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  {...form.register("temperature", { valueAsNumber: true })}
                />
              </FormField>
              <FormField
                label="Max Tokens"
                htmlFor={`agent-max-tokens-${suffix}`}
                error={form.formState.errors.max_tokens?.message}
              >
                <Input
                  id={`agent-max-tokens-${suffix}`}
                  type="number"
                  min="1"
                  max="1000000"
                  {...form.register("max_tokens", { valueAsNumber: true })}
                />
              </FormField>
              <FormField
                label="Top P"
                htmlFor={`agent-top-p-${suffix}`}
                error={form.formState.errors.top_p?.message}
              >
                <Input
                  id={`agent-top-p-${suffix}`}
                  type="number"
                  min="0.01"
                  max="1"
                  step="0.01"
                  {...form.register("top_p", { valueAsNumber: true })}
                />
              </FormField>
            </div>
          </fieldset>

          <fieldset className="grid gap-4 rounded-xl border p-4">
            <legend className="px-1 text-sm font-semibold">Prompt</legend>
            <FormField
              label="Prompt 模板"
              htmlFor={`agent-prompt-${suffix}`}
              error={form.formState.errors.prompt_template_id?.message}
              hint="发布 Agent 时，所选 Prompt 必须处于 published 状态"
            >
              <Controller
                control={form.control}
                name="prompt_template_id"
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(value) => field.onChange(Number(value))}
                  >
                    <SelectTrigger id={`agent-prompt-${suffix}`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">不使用 Prompt 模板</SelectItem>
                      {prompts.map((prompt) => (
                        <SelectItem key={prompt.id} value={String(prompt.id)}>
                          {prompt.name} · {prompt.version || "未发布"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField
              label="附加系统提示词"
              htmlFor={`agent-system-prompt-${suffix}`}
              error={form.formState.errors.system_prompt?.message}
            >
              <Textarea
                id={`agent-system-prompt-${suffix}`}
                rows={5}
                placeholder="在 Prompt 模板之后追加的系统约束"
                {...form.register("system_prompt")}
              />
            </FormField>
          </fieldset>

          <fieldset className="grid gap-4 rounded-xl border p-4">
            <legend className="px-1 text-sm font-semibold">RAG 配置</legend>
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                {...form.register("rag_enabled")}
              />
              启用知识库上下文
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                label="检索策略"
                htmlFor={`agent-retrieval-${suffix}`}
                error={form.formState.errors.retrieval_strategy?.message}
              >
                <Controller
                  control={form.control}
                  name="retrieval_strategy"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        if (value) field.onChange(value)
                      }}
                    >
                      <SelectTrigger
                        id={`agent-retrieval-${suffix}`}
                        className="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {retrievalStrategyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField
                label="Top K"
                htmlFor={`agent-top-k-${suffix}`}
                error={form.formState.errors.top_k?.message}
              >
                <Input
                  id={`agent-top-k-${suffix}`}
                  type="number"
                  min="1"
                  max="100"
                  {...form.register("top_k", { valueAsNumber: true })}
                />
              </FormField>
              <FormField
                label="相似度阈值"
                htmlFor={`agent-threshold-${suffix}`}
                error={form.formState.errors.similarity_threshold?.message}
              >
                <Input
                  id={`agent-threshold-${suffix}`}
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  {...form.register("similarity_threshold", {
                    valueAsNumber: true,
                  })}
                />
              </FormField>
            </div>
            <ResourceChecks
              label="知识库"
              name="knowledge_base_ids"
              disabled={!ragEnabled}
              options={knowledgeBases.map((item) => ({
                id: item.id,
                name: item.name,
                detail: `${item.status} · ${item.segment_count} 个片段`,
              }))}
              control={form.control}
              error={form.formState.errors.knowledge_base_ids?.message}
            />
          </fieldset>

          <fieldset className="grid gap-4 rounded-xl border p-4">
            <legend className="px-1 text-sm font-semibold">工具配置</legend>
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                {...form.register("tools_enabled")}
              />
              启用 Function Calling
            </label>
            <ResourceChecks
              label="工具"
              name="tool_ids"
              disabled={!toolsEnabled}
              options={tools.map((item) => ({
                id: item.id,
                name: item.name,
                detail: `${item.status} · ${item.type}`,
              }))}
              control={form.control}
              error={form.formState.errors.tool_ids?.message}
            />
          </fieldset>

          <fieldset className="grid gap-4 rounded-xl border p-4">
            <legend className="px-1 text-sm font-semibold">高级设置</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="欢迎语"
                htmlFor={`agent-welcome-${suffix}`}
                error={form.formState.errors.welcome_message?.message}
              >
                <Textarea
                  id={`agent-welcome-${suffix}`}
                  rows={3}
                  {...form.register("welcome_message")}
                />
              </FormField>
              <FormField
                label="推荐问题"
                htmlFor={`agent-questions-${suffix}`}
                error={form.formState.errors.suggested_questions?.message}
                hint="每行一个，最多 20 条"
              >
                <Textarea
                  id={`agent-questions-${suffix}`}
                  rows={3}
                  {...form.register("suggested_questions")}
                />
              </FormField>
              <FormField
                label="最大对话轮数"
                htmlFor={`agent-max-turns-${suffix}`}
                error={form.formState.errors.max_turns?.message}
              >
                <Input
                  id={`agent-max-turns-${suffix}`}
                  type="number"
                  min="1"
                  max="1000"
                  {...form.register("max_turns", { valueAsNumber: true })}
                />
              </FormField>
              <FormField
                label="调用超时（秒）"
                htmlFor={`agent-timeout-${suffix}`}
                error={form.formState.errors.timeout?.message}
              >
                <Input
                  id={`agent-timeout-${suffix}`}
                  type="number"
                  min="0.1"
                  max="300"
                  step="0.1"
                  {...form.register("timeout", { valueAsNumber: true })}
                />
              </FormField>
            </div>
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
              保存草稿
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type ResourceChecksProps = {
  label: string
  name: "knowledge_base_ids" | "tool_ids"
  options: Array<{ id: number; name: string; detail: string }>
  disabled: boolean
  control: ReturnType<typeof useForm<AgentFormInput>>["control"]
  error?: string
}

function ResourceChecks({
  label,
  name,
  options,
  disabled,
  control,
  error,
}: ResourceChecksProps) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div className="grid max-h-44 gap-2 overflow-y-auto sm:grid-cols-2">
            {options.length > 0 ? (
              options.map((option) => {
                const selected = field.value.includes(option.id)
                return (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 accent-primary"
                      disabled={disabled}
                      checked={selected}
                      onChange={(event) => {
                        field.onChange(
                          event.target.checked
                            ? [...field.value, option.id]
                            : field.value.filter((id) => id !== option.id),
                        )
                      }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {option.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {option.detail}
                      </span>
                    </span>
                  </label>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                暂无可选{label}
              </p>
            )}
          </div>
        )}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function agentFormDefaults(agent?: Agent): AgentFormInput {
  const config = agent?.config
  return {
    name: agent?.name ?? "",
    description: agent?.description ?? "",
    type: agent?.type ?? "conversation",
    model_id: agent?.model_id ?? 0,
    temperature: config?.model.temperature ?? 0.7,
    max_tokens: config?.model.maxTokens ?? 2_048,
    top_p: config?.model.topP ?? 1,
    prompt_template_id: config?.prompt.promptTemplateId ?? 0,
    system_prompt: config?.prompt.systemPrompt ?? "",
    rag_enabled: config?.rag.enabled ?? false,
    knowledge_base_ids: config?.rag.knowledgeBaseIds ?? [],
    retrieval_strategy: config?.rag.retrievalStrategy ?? "hybrid",
    top_k: config?.rag.topK ?? 5,
    similarity_threshold: config?.rag.similarityThreshold ?? 0.7,
    tools_enabled: config?.tools.enabled ?? false,
    tool_ids: config?.tools.toolIds ?? [],
    welcome_message: config?.advanced.welcomeMessage ?? "",
    suggested_questions:
      config?.advanced.suggestedQuestions.join("\n") ?? "",
    max_turns: config?.advanced.maxTurns ?? 20,
    timeout: config?.advanced.timeout ?? 30,
  }
}

function toAgentPayload(
  value: AgentFormInput,
  models: Model[],
): AgentCreateInput {
  const model = models.find((item) => item.id === value.model_id)
  return {
    name: value.name,
    description: value.description || null,
    type: value.type,
    model_id: model?.id ?? null,
    config: {
      model: {
        modelId: model?.model_id ?? null,
        temperature: value.temperature,
        maxTokens: value.max_tokens,
        topP: value.top_p,
      },
      prompt: {
        systemPrompt: value.system_prompt,
        promptTemplateId: value.prompt_template_id || null,
      },
      rag: {
        enabled: value.rag_enabled,
        knowledgeBaseIds: value.knowledge_base_ids,
        retrievalStrategy: value.retrieval_strategy,
        topK: value.top_k,
        similarityThreshold: value.similarity_threshold,
      },
      tools: {
        enabled: value.tools_enabled,
        toolIds: value.tool_ids,
      },
      advanced: {
        welcomeMessage: value.welcome_message,
        suggestedQuestions: value.suggested_questions
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        maxTurns: value.max_turns,
        timeout: value.timeout,
      },
    },
  }
}
