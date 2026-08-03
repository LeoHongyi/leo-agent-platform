import { afterEach, describe, expect, it, vi } from "vitest"

import { agentsApi } from "@/features/agents/api"
import type { AgentConfig } from "@/lib/api/schemas"

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

const config: AgentConfig = {
  model: {
    modelId: "gpt-4",
    temperature: 0.7,
    maxTokens: 2_048,
    topP: 1,
  },
  prompt: {
    systemPrompt: "你是专业客服",
    promptTemplateId: 2,
  },
  rag: {
    enabled: true,
    knowledgeBaseIds: [3],
    retrievalStrategy: "hybrid",
    topK: 5,
    similarityThreshold: 0.7,
  },
  tools: {
    enabled: true,
    toolIds: [4],
  },
  advanced: {
    welcomeMessage: "你好",
    suggestedQuestions: ["产品价格"],
    maxTurns: 20,
    timeout: 30,
  },
}

const agent = {
  id: 8,
  name: "智能客服 Agent",
  description: "处理客户咨询",
  type: "conversation",
  status: "inactive",
  model_id: 1,
  prompt_id: 2,
  config,
  success_rate: 100,
  call_count_7d: 3,
  version: "v1.0",
  current_version_id: 10,
  created_by: "admin",
  created_at: "2026-07-31T10:00:00",
  updated_at: "2026-07-31T10:00:00",
} as const

describe("agentsApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("lists Agents with pagination and parses typed aggregate config", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        code: 200,
        message: "success",
        data: {
          items: [agent],
          total: 1,
          page: 2,
          page_size: 10,
        },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await agentsApi.list({
      page: 2,
      pageSize: 10,
      search: "客服",
    })

    expect(result.items[0].config?.rag.knowledgeBaseIds).toEqual([3])
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backend/api/v1/agents?page=2&page_size=10&keyword=%E5%AE%A2%E6%9C%8D",
      expect.objectContaining({ credentials: "same-origin" }),
    )
  })

  it("creates an Agent with the backend reference payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        code: 200,
        message: "success",
        data: { ...agent, status: "draft", version: null },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    await agentsApi.create({
      name: agent.name,
      description: agent.description,
      type: "conversation",
      model_id: 1,
      config,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backend/api/v1/agents",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: agent.name,
          description: agent.description,
          type: "conversation",
          model_id: 1,
          config,
        }),
      }),
    )
  })

  it("uses dedicated publish, start, stop and rollback routes", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        jsonResponse({ code: 200, message: "success", data: agent }),
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    await agentsApi.publish(agent.id, { changelog: "initial" })
    await agentsApi.start(agent.id)
    await agentsApi.stop(agent.id)
    await agentsApi.rollback(agent.id, { version_id: 10 })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/backend/api/v1/agents/8/publish",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ changelog: "initial" }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/backend/api/v1/agents/8/start",
      expect.objectContaining({ method: "POST" }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/backend/api/v1/agents/8/stop",
      expect.objectContaining({ method: "POST" }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/backend/api/v1/agents/8/rollback",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ version_id: 10 }),
      }),
    )
  })

  it("invokes an active Agent and parses runtime details", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        code: 200,
        message: "success",
        data: {
          content: "您好，Leo",
          tool_calls: [],
          usage: { total_tokens: 12 },
          model_id: "gpt-4",
          latency_ms: 81,
        },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await agentsApi.invoke(agent.id, {
      input: "你好",
      history: [],
      variables: { customer: "Leo" },
    })

    expect(result.content).toBe("您好，Leo")
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backend/api/v1/agents/8/invoke",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          input: "你好",
          history: [],
          variables: { customer: "Leo" },
        }),
      }),
    )
  })
})
