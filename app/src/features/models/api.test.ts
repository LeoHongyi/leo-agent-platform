import { afterEach, describe, expect, it, vi } from "vitest"

import { modelsApi } from "@/features/models/api"

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

const model = {
  id: 5,
  name: "GPT-4o",
  model_id: "gpt-4o",
  provider_id: 2,
  provider_name: "OpenAI",
  capabilities: ["chat", "vision"],
  context_length: 128000,
  status: "available",
  input_price: 0.005,
  output_price: 0.015,
  currency: "USD",
  is_default: true,
  description: null,
}

describe("modelsApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("keeps pagination, search and provider filters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        code: 200,
        message: "success",
        data: {
          items: [model],
          total: 1,
          page: 2,
          page_size: 20,
        },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    await modelsApi.list({
      page: 2,
      pageSize: 20,
      search: "gpt",
      providerId: 2,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backend/api/v1/models?page=2&page_size=20&keyword=gpt&provider_id=2",
      expect.objectContaining({ credentials: "same-origin" }),
    )
  })

  it("sends nullable descriptions when updating", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        code: 200,
        message: "success",
        data: model,
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    await modelsApi.update(model.id, { description: null })

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backend/api/v1/models/5",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ description: null }),
      }),
    )
  })
})
