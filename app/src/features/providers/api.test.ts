import { afterEach, describe, expect, it, vi } from "vitest"

import { providersApi } from "@/features/providers/api"

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

const provider = {
  id: 12,
  name: "Local API",
  type: "local",
  status: "disconnected",
  endpoint: "http://127.0.0.1:11434/v1",
  description: null,
  model_count: 0,
}

describe("providersApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("sends documented pagination and search parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        code: 200,
        message: "success",
        data: {
          items: [provider],
          total: 1,
          page: 2,
          page_size: 20,
        },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await providersApi.list({
      page: 2,
      pageSize: 20,
      search: "local",
    })

    expect(result.items).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backend/api/v1/providers?page=2&page_size=20&keyword=local",
      expect.objectContaining({ credentials: "same-origin" }),
    )
  })

  it("can explicitly clear an encrypted API key on update", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        code: 200,
        message: "success",
        data: provider,
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    await providersApi.update(provider.id, { api_key: null })

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backend/api/v1/providers/12",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ api_key: null }),
      }),
    )
  })

  it("parses a real connection test result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        code: 200,
        message: "success",
        data: {
          success: true,
          message: "连接成功",
          latency_ms: 18,
          status_code: 200,
        },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await providersApi.testConnection(provider.id)

    expect(result).toEqual({
      success: true,
      message: "连接成功",
      latency_ms: 18,
      status_code: 200,
    })
  })
})
