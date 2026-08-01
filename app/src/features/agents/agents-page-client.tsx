"use client"

import { useQuery } from "@tanstack/react-query"
import { LoaderCircle } from "lucide-react"
import { useMemo } from "react"

import { ListToolbar } from "@/components/common/list-toolbar"
import { PageHeader } from "@/components/common/page-header"
import { TablePagination } from "@/components/common/table-pagination"
import { TableState } from "@/components/common/table-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AgentFormDialog } from "@/features/agents/agent-form-dialog"
import { AgentStateButton } from "@/features/agents/agent-state-button"
import { AgentVersionsDialog } from "@/features/agents/agent-versions-dialog"
import { agentsApi } from "@/features/agents/api"
import {
  agentStatusLabels,
  agentTypeLabels,
  retrievalStrategyLabels,
} from "@/features/agents/constants"
import { DeleteAgentDialog } from "@/features/agents/delete-agent-dialog"
import { InvokeAgentDialog } from "@/features/agents/invoke-agent-dialog"
import { PublishAgentDialog } from "@/features/agents/publish-agent-dialog"
import { knowledgeBasesApi } from "@/features/knowledge-bases/api"
import { modelsApi } from "@/features/models/api"
import { promptsApi } from "@/features/prompts/api"
import { toolsApi } from "@/features/tools/api"
import type { ListParams, ModelListParams } from "@/lib/api/client"
import type { AgentStatus, Model } from "@/lib/api/schemas"
import { queryKeys } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

const allListParams = { page: 1, pageSize: 100, search: "" }
const allModelParams: ModelListParams = { ...allListParams }
const emptyModels: Model[] = []
const statusClassNames: Record<AgentStatus, string> = {
  draft:
    "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  inactive: "border-border bg-muted/50 text-muted-foreground",
  active:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
}

export function AgentsPageClient({ params }: { params: ListParams }) {
  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(params),
    queryFn: () => agentsApi.list(params),
  })
  const modelsQuery = useQuery({
    queryKey: queryKeys.models.list(allModelParams),
    queryFn: () => modelsApi.list(allModelParams),
  })
  const promptsQuery = useQuery({
    queryKey: queryKeys.prompts.list(allListParams),
    queryFn: () => promptsApi.list(allListParams),
  })
  const knowledgeBasesQuery = useQuery({
    queryKey: queryKeys.knowledgeBases.list(allListParams),
    queryFn: () => knowledgeBasesApi.list(allListParams),
  })
  const toolsQuery = useQuery({
    queryKey: queryKeys.tools.list(allListParams),
    queryFn: () => toolsApi.list(allListParams),
  })

  const agents = agentsQuery.data?.items ?? []
  const models = modelsQuery.data?.items ?? emptyModels
  const prompts = promptsQuery.data?.items ?? []
  const knowledgeBases = knowledgeBasesQuery.data?.items ?? []
  const tools = toolsQuery.data?.items ?? []
  const modelNames = useMemo(
    () => new Map(models.map((model) => [model.id, model.name])),
    [models],
  )
  const referencePending =
    modelsQuery.isPending ||
    promptsQuery.isPending ||
    knowledgeBasesQuery.isPending ||
    toolsQuery.isPending
  const referenceError =
    modelsQuery.error ||
    promptsQuery.error ||
    knowledgeBasesQuery.error ||
    toolsQuery.error

  return (
    <>
      <PageHeader
        title="Agent 管理"
        description="配置模型、Prompt、RAG 与工具，发布版本并控制运行生命周期"
        action={
          referencePending ? (
            <Button disabled>
              <LoaderCircle className="animate-spin" />
              加载依赖
            </Button>
          ) : (
            <AgentFormDialog
              models={models}
              prompts={prompts}
              knowledgeBases={knowledgeBases}
              tools={tools}
            />
          )
        }
      />
      {referenceError ? (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          部分依赖资源加载失败：{referenceError.message}
        </div>
      ) : null}
      <Card className="surface-panel gap-0 py-0">
        <div className="p-4">
          <ListToolbar
            search={params.search}
            placeholder="搜索 Agent 名称或描述"
          />
        </div>
        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>类型 / 状态</TableHead>
                <TableHead>模型</TableHead>
                <TableHead>聚合配置</TableHead>
                <TableHead>版本</TableHead>
                <TableHead>近 7 日统计</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableState
                columns={7}
                pending={agentsQuery.isPending}
                error={agentsQuery.error}
                empty={!agents.length}
                onRetry={() => agentsQuery.refetch()}
              />
              {agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell className="min-w-56">
                    <span className="block font-medium">{agent.name}</span>
                    <span className="block max-w-72 truncate text-xs text-muted-foreground">
                      {agent.description || "暂无描述"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      #{agent.id}
                      {agent.created_by ? ` · ${agent.created_by}` : ""}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="grid min-w-24 gap-1.5">
                      <Badge variant="secondary" className="w-fit">
                        {agentTypeLabels[agent.type]}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "w-fit",
                          statusClassNames[agent.status],
                        )}
                      >
                        {agentStatusLabels[agent.status]}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-36">
                    <span className="block text-sm">
                      {agent.model_id
                        ? modelNames.get(agent.model_id) ||
                          `模型 #${agent.model_id}`
                        : "未配置"}
                    </span>
                    <span className="block font-mono text-xs text-muted-foreground">
                      {agent.config?.model.modelId || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="min-w-44">
                    <span className="block text-xs text-muted-foreground">
                      Prompt #{agent.prompt_id || "无"}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      RAG {agent.config?.rag.enabled ? "开启" : "关闭"} ·{" "}
                      {agent.config?.rag.knowledgeBaseIds.length || 0} 个知识库
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      工具 {agent.config?.tools.enabled ? "开启" : "关闭"} ·{" "}
                      {agent.config?.tools.toolIds.length || 0} 个
                    </span>
                    {agent.config?.rag.enabled ? (
                      <span className="block text-xs text-muted-foreground">
                        {retrievalStrategyLabels[
                          agent.config.rag.retrievalStrategy
                        ]}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {agent.version || "未发布"}
                  </TableCell>
                  <TableCell className="min-w-28 text-sm">
                    <span className="block font-mono">
                      {agent.call_count_7d.toLocaleString("zh-CN")} 次
                    </span>
                    <span className="block font-mono text-xs text-muted-foreground">
                      {agent.success_rate.toFixed(2)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-max justify-end gap-1.5">
                      <InvokeAgentDialog agent={agent} />
                      <AgentStateButton agent={agent} />
                      <PublishAgentDialog agent={agent} />
                      <AgentVersionsDialog agent={agent} />
                      <AgentFormDialog
                        agent={agent}
                        models={models}
                        prompts={prompts}
                        knowledgeBases={knowledgeBases}
                        tools={tools}
                      />
                      <DeleteAgentDialog agent={agent} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <TablePagination
          params={params}
          total={agentsQuery.data?.total ?? 0}
        />
      </Card>
    </>
  )
}
