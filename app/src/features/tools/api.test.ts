import { afterEach, describe, expect, it, vi } from "vitest"

import { toolsApi } from "@/features/tools/api"

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

const tool = {
  id: 9,
  name: "查询订单",
  description: "查询订单状态",
  type: "http_api",
  status: "disabled",
  config: {
    url: "https://api.example.com/orders",
    method: "GET",
  },
  function_definition: {
    name: "get_order",
    description: "根据订单号查询状态",
    parameters: {
      type: "object",
      properties: { order_id: { type: "string" } },
    },
  },
  call_count_7d: 12,
  success_rate: 99.5,
  avg_latency: 128,
  created_by: "admin",
}

describe("toolsApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("sends pagination and search parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        code: 200,
        message: "success",
        data: {
          items: [tool],
          total: 1,
          page: 2,
          page_size: 20,
        },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await toolsApi.list({
      page: 2,
      pageSize: 20,
      search: "订单",
    })

    expect(result.items[0].function_definition?.name).toBe("get_order")
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backend/api/v1/tools?page=2&page_size=20&keyword=%E8%AE%A2%E5%8D%95",
      expect.objectContaining({ credentials: "same-origin" }),
    )
  })

  it("creates a tool with runtime and function definitions", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        code: 200,
        message: "success",
        data: tool,
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    await toolsApi.create({
      name: tool.name,
      description: tool.description,
      type: "http_api",
      config: tool.config,
      function_definition: tool.function_definition,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backend/api/v1/tools",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: tool.name,
          description: tool.description,
          type: "http_api",
          config: tool.config,
          function_definition: tool.function_definition,
        }),
      }),
    )
  })

  it("uses dedicated endpoints for status transitions", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          code: 200,
          message: "success",
          data: { ...tool, status: "enabled" },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          code: 200,
          message: "success",
          data: tool,
        }),
      )
    vi.stubGlobal("fetch", fetchMock)

    await toolsApi.enable(tool.id)
    await toolsApi.disable(tool.id)

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/backend/api/v1/tools/9/enable",
      expect.objectContaining({ method: "POST" }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/backend/api/v1/tools/9/disable",
      expect.objectContaining({ method: "POST" }),
    )
  })

  it("tests a tool with JSON input and parses execution details", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        code: 200,
        message: "success",
        data: {
          success: true,
          output: { status: "paid" },
          error: null,
          latency_ms: 81,
          status_code: 200,
        },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await toolsApi.test(tool.id, {
      input: { order_id: "ORDER-1" },
    })

    expect(result.output).toEqual({ status: "paid" })
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backend/api/v1/tools/9/test",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ input: { order_id: "ORDER-1" } }),
      }),
    )
  })
})
