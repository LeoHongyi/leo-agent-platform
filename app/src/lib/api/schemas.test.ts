import { describe, expect, it } from "vitest"

import {
  modelCreateSchema,
  modelSchema,
  modelUpdateSchema,
  permissionCreateSchema,
  providerConnectionTestResultSchema,
  providerCreateSchema,
  providerSchema,
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
})
