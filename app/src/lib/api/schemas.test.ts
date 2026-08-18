import { describe, expect, it } from "vitest"

import {
  knowledgeBaseConfigSchema,
  knowledgeBaseCreateSchema,
  knowledgeBaseSchema,
  knowledgeBaseUpdateSchema,
  knowledgeDocumentSchema,
  knowledgeSegmentSchema,
  modelCreateSchema,
  modelSchema,
  modelUpdateSchema,
  permissionCreateSchema,
  providerConnectionTestResultSchema,
  providerCreateSchema,
  providerSchema,
  retrievalTestInputSchema,
  retrievalTestResultSchema,
  segmentUpdateSchema,
  userWithRolesSchema,
} from "@/lib/api/schemas"

describe("OpenAPI schemas", () => {
  it("accepts a user with nested roles and permissions", () => {
    const result = userWithRolesSchema.safeParse({
      id: 1,
      username: "test",
      email: "test@test.com",
      is_active: true,
      roles: [
        {
          id: 1,
          code: "admin",
          name: "管理员",
          description: null,
          permissions: [
            {
              id: 1,
              code: "user:list",
              name: "用户列表",
              description: null,
            },
          ],
        },
      ],
    })

    expect(result.success).toBe(true)
  })

  it("enforces the documented permission code convention", () => {
    expect(
      permissionCreateSchema.safeParse({
        code: "user:list",
        name: "用户列表",
      }).success,
    ).toBe(true)
    expect(
      permissionCreateSchema.safeParse({
        code: "not valid",
        name: "无效权限",
      }).success,
    ).toBe(false)
  })

  it("parses provider responses without exposing an API key", () => {
    const result = providerSchema.parse({
      id: 7,
      name: "Production OpenAI",
      type: "openai",
      status: "connected",
      endpoint: "https://api.openai.com/v1",
      description: null,
      model_count: 3,
      api_key: "must-not-reach-the-client",
    })

    expect(result).not.toHaveProperty("api_key")
  })

  it("validates provider write inputs and connection test results", () => {
    expect(
      providerCreateSchema.safeParse({
        name: "Local model",
        type: "local",
        endpoint: "http://127.0.0.1:11434/v1",
      }).success,
    ).toBe(true)
    expect(
      providerCreateSchema.safeParse({
        name: "Invalid",
        type: "custom",
        endpoint: "ftp://example.com",
      }).success,
    ).toBe(false)
    expect(
      providerConnectionTestResultSchema.safeParse({
        success: false,
        message: "Unauthorized",
        latency_ms: 42,
        status_code: 401,
      }).success,
    ).toBe(true)
  })

  it("parses the model response contract", () => {
    expect(
      modelSchema.safeParse({
        id: 1,
        name: "GPT-4o",
        model_id: "gpt-4o",
        provider_id: 7,
        provider_name: "OpenAI",
        capabilities: ["chat", "vision"],
        context_length: 128000,
        status: "available",
        input_price: 0.005,
        output_price: 0.015,
        currency: "USD",
        is_default: true,
        description: null,
      }).success,
    ).toBe(true)
  })

  it("rejects invalid model prices, context lengths and statuses", () => {
    expect(
      modelCreateSchema.safeParse({
        name: "Invalid",
        model_id: "invalid",
        provider_id: 1,
        capabilities: [],
        context_length: -1,
        input_price: -1,
        output_price: 0,
        currency: "USD",
        is_default: false,
      }).success,
    ).toBe(false)
    expect(
      modelUpdateSchema.safeParse({ status: "invalid-status" }).success,
    ).toBe(false)
    expect(
      modelUpdateSchema.safeParse({ description: null }).success,
    ).toBe(true)
  })

  it("parses the complete knowledge base response contract", () => {
    const result = knowledgeBaseSchema.safeParse({
      id: 3,
      name: "产品知识库",
      description: "产品说明",
      status: "ready",
      document_count: 2,
      segment_count: 18,
      embedding_model: "text-embedding-ada-002",
      chunk_method: "paragraph",
      chunk_size: 800,
      chunk_overlap: 80,
      retrieval_strategy: "hybrid",
      top_k: 5,
      similarity_threshold: 0.7,
      created_by: "admin",
      created_at: "2026-08-06T10:00:00",
      updated_at: "2026-08-06T10:30:00",
    })

    expect(result.success).toBe(true)
  })

  it("applies knowledge defaults and enforces strict update rules", () => {
    const create = knowledgeBaseCreateSchema.parse({
      name: "  产品知识库  ",
      description: "   ",
    })

    expect(create).toMatchObject({
      name: "产品知识库",
      description: null,
      embedding_model: "text-embedding-ada-002",
      chunk_method: "fixed",
      chunk_size: 500,
      chunk_overlap: 50,
      retrieval_strategy: "hybrid",
      top_k: 5,
      similarity_threshold: 0.7,
    })
    expect(knowledgeBaseUpdateSchema.safeParse({}).success).toBe(false)
    expect(knowledgeBaseConfigSchema.safeParse({}).success).toBe(false)
    expect(
      knowledgeBaseCreateSchema.safeParse({
        name: "invalid overlap",
        chunk_size: 200,
        chunk_overlap: 200,
      }).success,
    ).toBe(false)
    expect(
      knowledgeBaseConfigSchema.safeParse({ unknown: true }).success,
    ).toBe(false)
  })

  it("parses document and segment records and validates segment edits", () => {
    expect(
      knowledgeDocumentSchema.safeParse({
        id: 9,
        knowledge_base_id: 3,
        file_name: "产品手册.pdf",
        file_type: "pdf",
        file_size: "2048",
        minio_path: "knowledge-bases/3/products.pdf",
        status: "completed",
        segment_count: 9,
        word_count: 2_048,
        error_message: null,
        uploaded_by: "admin",
        created_at: "2026-08-06T10:00:00",
        uploaded_at: "2026-08-06T10:00:00",
        processed_at: "2026-08-06T10:01:00",
        updated_at: "2026-08-06T10:01:00",
      }).success,
    ).toBe(true)
    expect(
      knowledgeSegmentSchema.safeParse({
        id: 11,
        knowledge_base_id: 3,
        document_id: 9,
        position: 0,
        content: "产品支持混合检索。",
        word_count: 1,
        token_count: 8,
        keywords: ["产品", "检索"],
        hit_count: 0,
        created_at: "2026-08-06T10:01:00",
        updated_at: "2026-08-06T10:01:00",
      }).success,
    ).toBe(true)

    expect(
      segmentUpdateSchema.parse({ keywords: [" 产品 ", "产品"] }),
    ).toEqual({ keywords: ["产品"] })
    expect(segmentUpdateSchema.safeParse({ content: "   " }).success).toBe(
      false,
    )
    expect(segmentUpdateSchema.safeParse({}).success).toBe(false)
  })

  it("validates retrieval inputs, defaults and scored results", () => {
    expect(retrievalTestInputSchema.parse({ query: "  产品价格  " })).toEqual(
      {
        query: "产品价格",
        strategy: "hybrid",
        top_k: 5,
        similarity_threshold: 0.7,
      },
    )
    expect(
      retrievalTestResultSchema.safeParse({
        segment_id: 11,
        document_id: 9,
        document_name: "产品手册.pdf",
        content: "产品价格请咨询销售。",
        score: 0.82,
        position: 0,
      }).success,
    ).toBe(true)
    expect(
      retrievalTestResultSchema.safeParse({
        segment_id: 11,
        document_id: 9,
        document_name: "产品手册.pdf",
        content: "invalid",
        score: 1.1,
        position: 0,
      }).success,
    ).toBe(false)
  })
})
