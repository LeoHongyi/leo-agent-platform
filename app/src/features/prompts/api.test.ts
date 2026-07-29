import { afterEach, describe, expect, it, vi } from "vitest"

import { promptsApi } from "@/features/prompts/api"

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

const variable = {
  name: "topic",
  type: "string",
  description: "主题",
  default_value: null,
  required: true,
}

const prompt = {
  id: 8,
  name: "客服回复",
  description: null,
  category: "support",
  tags: ["客服"],
  content: "请回复 {topic}",
  variables: [variable],
  version: "v1.0",
  status: "published",
  created_by: "admin",
  current_version_id: 21,
}

describe("promptsApi", () => {
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
          items: [prompt],
          total: 1,
          page: 2,
          page_size: 20,
        },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await promptsApi.list({
      page: 2,
      pageSize: 20,
      search: "support",
    })

    expect(result.items).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backend/api/v1/prompts?page=2&page_size=20&keyword=support",
      expect.objectContaining({ credentials: "same-origin" }),
    )
  })

  it("publishes with changelog and parses the new version", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        code: 200,
        message: "success",
        data: { ...prompt, version: "v1.1", current_version_id: 22 },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await promptsApi.publish(prompt.id, {
      changelog: "调整语气",
    })

    expect(result.version).toBe("v1.1")
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backend/api/v1/prompts/8/publish",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ changelog: "调整语气" }),
      }),
    )
  })

  it("parses version snapshots and rolls back by version id", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          code: 200,
          message: "success",
          data: [
            {
              id: 21,
              prompt_id: prompt.id,
              version: "v1.0",
              content: prompt.content,
              variables: [variable],
              changelog: "首次发布",
              is_current: true,
              published_by: "admin",
              published_at: "2026-07-29T15:00:00",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          code: 200,
          message: "success",
          data: prompt,
        }),
      )
    vi.stubGlobal("fetch", fetchMock)

    const versions = await promptsApi.versions(prompt.id)
    await promptsApi.rollback(prompt.id, { version_id: versions[0].id })

    expect(versions[0].variables[0].name).toBe("topic")
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/backend/api/v1/prompts/8/rollback",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ version_id: 21 }),
      }),
    )
  })
})
