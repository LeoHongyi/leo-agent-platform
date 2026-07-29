import { describe, expect, it } from "vitest"
import { z } from "zod"

import { ApiError, parseEnvelope } from "@/lib/api/response"

describe("parseEnvelope", () => {
  it("parses a successful FBA response", () => {
    expect(
      parseEnvelope(
        { code: 200, message: "success", data: { id: 1 } },
        z.object({ id: z.number() }),
      ),
    ).toEqual({ id: 1 })
  })

  it("turns an HTTP 200 business error into ApiError", () => {
    const parse = () =>
      parseEnvelope(
        { code: 400, message: "验证码错误", data: null },
        z.object({ id: z.number() }),
      )

    expect(parse).toThrowError(ApiError)
    expect(parse).toThrowError("验证码错误")
  })

  it("rejects a response that diverges from OpenAPI", () => {
    expect(() =>
      parseEnvelope(
        { code: 200, message: "success", data: { id: "1" } },
        z.object({ id: z.number() }),
      ),
    ).toThrow("无法识别的数据")
  })
})
