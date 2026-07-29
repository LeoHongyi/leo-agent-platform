import { describe, expect, it } from "vitest"

import {
  parseListParams,
  parseOptionalPositiveInteger,
} from "@/lib/list-params"

describe("parseListParams", () => {
  it("uses safe defaults", () => {
    expect(parseListParams({})).toEqual({
      page: 1,
      pageSize: 10,
      search: "",
    })
  })

  it("bounds pagination and normalizes search", () => {
    expect(
      parseListParams({
        page: "-2",
        page_size: "999",
        search: "  admin  ",
      }),
    ).toEqual({
      page: 1,
      pageSize: 100,
      search: "admin",
    })
  })

  it("parses optional positive filter identifiers", () => {
    expect(parseOptionalPositiveInteger("7")).toBe(7)
    expect(parseOptionalPositiveInteger(["8", "9"])).toBe(8)
    expect(parseOptionalPositiveInteger("0")).toBeUndefined()
    expect(parseOptionalPositiveInteger("invalid")).toBeUndefined()
  })
})
