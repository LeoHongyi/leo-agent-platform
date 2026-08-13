import { afterEach, describe, expect, it, vi } from "vitest"

import { knowledgeBasesApi } from "@/features/knowledge-bases/api"
import { queryKeys } from "@/lib/query-keys"

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function success(data: unknown) {
  return jsonResponse({ code: 200, message: "success", data })
}

const knowledgeBase = {
  id: 3,
  name: "产品知识库",
  description: "产品说明",
  status: "ready",
  document_count: 1,
  segment_count: 1,
  embedding_model: "text-embedding-ada-002",
  chunk_method: "fixed",
  chunk_size: 500,
  chunk_overlap: 50,
  retrieval_strategy: "hybrid",
  top_k: 5,
  similarity_threshold: 0.7,
  created_by: "admin",
  created_at: "2026-08-06T10:00:00",
  updated_at: "2026-08-06T10:00:00",
} as const

const document = {
  id: 9,
  knowledge_base_id: knowledgeBase.id,
  file_name: "产品手册.pdf",
  file_type: "pdf",
  file_size: "2048",
  minio_path: "knowledge-bases/3/products.pdf",
  status: "completed",
  segment_count: 1,
  word_count: 20,
  error_message: null,
  uploaded_by: "admin",
  created_at: "2026-08-06T10:00:00",
  uploaded_at: "2026-08-06T10:00:00",
  processed_at: "2026-08-06T10:01:00",
  updated_at: "2026-08-06T10:01:00",
} as const

const segment = {
  id: 11,
  knowledge_base_id: knowledgeBase.id,
  document_id: document.id,
  position: 0,
  content: "产品支持混合检索。",
  word_count: 1,
  token_count: 8,
  keywords: ["产品", "检索"],
  hit_count: 0,
  created_at: "2026-08-06T10:01:00",
  updated_at: "2026-08-06T10:01:00",
} as const

describe("knowledgeBasesApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("covers knowledge base list, detail, create, update, config and delete", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        success({
          items: [knowledgeBase],
          total: 1,
          page: 2,
          page_size: 10,
        }),
      )
      .mockResolvedValueOnce(success(knowledgeBase))
      .mockResolvedValueOnce(success(knowledgeBase))
      .mockResolvedValueOnce(success(knowledgeBase))
      .mockResolvedValueOnce(success(knowledgeBase))
      .mockResolvedValueOnce(
        jsonResponse({ code: 200, message: "删除成功", data: null }),
      )
    vi.stubGlobal("fetch", fetchMock)

    await knowledgeBasesApi.list({
      page: 2,
      pageSize: 10,
      search: "产品",
    })
    await knowledgeBasesApi.get(knowledgeBase.id)
    await knowledgeBasesApi.create({ name: "新知识库" })
    await knowledgeBasesApi.update(knowledgeBase.id, {
      description: "  新说明  ",
    })
    await knowledgeBasesApi.updateConfig(knowledgeBase.id, {
      chunk_size: 800,
      chunk_overlap: 100,
    })
    await knowledgeBasesApi.remove(knowledgeBase.id)

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/backend/api/v1/knowledge-bases?page=2&page_size=10&keyword=%E4%BA%A7%E5%93%81",
      expect.objectContaining({ credentials: "same-origin" }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/backend/api/v1/knowledge-bases/3",
      expect.objectContaining({ credentials: "same-origin" }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/backend/api/v1/knowledge-bases",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "新知识库",
          description: null,
          embedding_model: "text-embedding-ada-002",
          chunk_method: "fixed",
          chunk_size: 500,
          chunk_overlap: 50,
          retrieval_strategy: "hybrid",
          top_k: 5,
          similarity_threshold: 0.7,
        }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/backend/api/v1/knowledge-bases/3",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ description: "新说明" }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/backend/api/v1/knowledge-bases/3/config",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ chunk_size: 800, chunk_overlap: 100 }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "/api/backend/api/v1/knowledge-bases/3",
      expect.objectContaining({ method: "DELETE" }),
    )
  })

  it("covers document list, detail, multipart upload, retry and delete", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        success({
          items: [document],
          total: 1,
          page: 1,
          page_size: 20,
        }),
      )
      .mockResolvedValueOnce(success(document))
      .mockResolvedValueOnce(success(document))
      .mockResolvedValueOnce(success(document))
      .mockResolvedValueOnce(
        jsonResponse({ code: 200, message: "删除成功", data: null }),
      )
    vi.stubGlobal("fetch", fetchMock)

    await knowledgeBasesApi.listDocuments(knowledgeBase.id, {
      page: 1,
      pageSize: 20,
      search: "手册",
      status: "completed",
    })
    await knowledgeBasesApi.getDocument(knowledgeBase.id, document.id)
    const file = new File(["manual"], "产品手册.pdf", {
      type: "application/pdf",
    })
    await knowledgeBasesApi.uploadDocument(knowledgeBase.id, file)
    await knowledgeBasesApi.retryDocument(knowledgeBase.id, document.id)
    await knowledgeBasesApi.removeDocument(knowledgeBase.id, document.id)

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/backend/api/v1/knowledge-bases/3/documents?page=1&page_size=20&keyword=%E6%89%8B%E5%86%8C&status=completed",
      expect.objectContaining({ credentials: "same-origin" }),
    )
    const uploadOptions = fetchMock.mock.calls[2]?.[1] as RequestInit
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      "/api/backend/api/v1/knowledge-bases/3/documents",
    )
    expect(uploadOptions.method).toBe("POST")
    expect(uploadOptions.body).toBeInstanceOf(FormData)
    expect((uploadOptions.body as FormData).get("file")).toBe(file)
    expect(new Headers(uploadOptions.headers).has("Content-Type")).toBe(
      false,
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/backend/api/v1/knowledge-bases/3/documents/9/retry",
      expect.objectContaining({ method: "POST" }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/backend/api/v1/knowledge-bases/3/documents/9",
      expect.objectContaining({ method: "DELETE" }),
    )
  })

  it("downloads binary content and decodes an RFC 5987 UTF-8 filename", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("manual", {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition":
            "attachment; filename*=UTF-8''%E4%BA%A7%E5%93%81%E6%89%8B%E5%86%8C.pdf",
        },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await knowledgeBasesApi.downloadDocument(
      knowledgeBase.id,
      document.id,
    )

    expect(result.fileName).toBe("产品手册.pdf")
    expect(result.contentType).toBe("application/pdf")
    expect(await result.blob.text()).toBe("manual")
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backend/api/v1/knowledge-bases/3/documents/9/download",
      expect.objectContaining({ credentials: "same-origin" }),
    )
  })

  it("surfaces JSON business errors returned by a download route", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          code: 43004,
          message: "MinIO 对象不存在",
          data: null,
        }),
      ),
    )

    await expect(
      knowledgeBasesApi.downloadDocument(knowledgeBase.id, document.id),
    ).rejects.toMatchObject({
      name: "ApiError",
      message: "MinIO 对象不存在",
      status: 400,
      code: 43004,
    })
  })

  it("covers segment filters, document segments, edits, delete and retrieval", async () => {
    const page = {
      items: [segment],
      total: 1,
      page: 1,
      page_size: 20,
    }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(success(page))
      .mockResolvedValueOnce(success(page))
      .mockResolvedValueOnce(success(segment))
      .mockResolvedValueOnce(
        jsonResponse({ code: 200, message: "删除成功", data: null }),
      )
      .mockResolvedValueOnce(
        success([
          {
            segment_id: segment.id,
            document_id: document.id,
            document_name: document.file_name,
            content: segment.content,
            score: 0.82,
            position: segment.position,
          },
        ]),
      )
    vi.stubGlobal("fetch", fetchMock)

    await knowledgeBasesApi.listSegments(knowledgeBase.id, {
      page: 1,
      pageSize: 20,
      search: "产品",
      documentId: document.id,
    })
    await knowledgeBasesApi.listDocumentSegments(
      knowledgeBase.id,
      document.id,
      { page: 1, pageSize: 20, search: "" },
    )
    await knowledgeBasesApi.updateSegment(
      knowledgeBase.id,
      segment.id,
      { content: "更新后的内容", keywords: [" 产品 ", "产品"] },
    )
    await knowledgeBasesApi.removeSegment(knowledgeBase.id, segment.id)
    await knowledgeBasesApi.testRetrieval(knowledgeBase.id, {
      query: "  产品价格  ",
    })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/backend/api/v1/knowledge-bases/3/segments?page=1&page_size=20&keyword=%E4%BA%A7%E5%93%81&document_id=9",
      expect.objectContaining({ credentials: "same-origin" }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/backend/api/v1/knowledge-bases/3/documents/9/segments?page=1&page_size=20",
      expect.objectContaining({ credentials: "same-origin" }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/backend/api/v1/knowledge-bases/3/segments/11",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          content: "更新后的内容",
          keywords: ["产品"],
        }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/backend/api/v1/knowledge-bases/3/retrieval-test",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          query: "产品价格",
          strategy: "hybrid",
          top_k: 5,
          similarity_threshold: 0.7,
        }),
      }),
    )
  })

  it("provides stable hierarchical query keys for cache invalidation", () => {
    const documentParams = {
      page: 1,
      pageSize: 20,
      search: "",
      status: "completed" as const,
    }
    const segmentParams = {
      page: 1,
      pageSize: 20,
      search: "",
      documentId: 9,
    }

    expect(queryKeys.knowledgeBases.detail(3)).toEqual([
      "knowledge-bases",
      "detail",
      3,
    ])
    expect(queryKeys.knowledgeBases.documents(3, documentParams)).toEqual([
      "knowledge-bases",
      3,
      "documents",
      "list",
      documentParams,
    ])
    expect(queryKeys.knowledgeBases.segments(3, segmentParams)).toEqual([
      "knowledge-bases",
      3,
      "segments",
      "list",
      segmentParams,
    ])
    expect(
      queryKeys.knowledgeBases.documentSegments(3, 9, {
        page: 1,
        pageSize: 20,
        search: "",
      }),
    ).toEqual([
      "knowledge-bases",
      3,
      "documents",
      9,
      "segments",
      { page: 1, pageSize: 20, search: "" },
    ])
  })
})
