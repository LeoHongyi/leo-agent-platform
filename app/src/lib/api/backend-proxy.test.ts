import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  DELETE,
  GET,
  POST,
  PUT,
} from "@/app/api/backend/[...path]/route"
import {
  downloadResponseHeaders,
  isAllowedRoute,
  isJsonContentType,
  isKnowledgeDownloadRoute,
  requestTimeoutMs,
} from "@/lib/api/backend-proxy"

vi.mock("@/lib/env", () => ({
  serverEnv: { BACKEND_API_URL: "http://backend.test:8000" },
}))

const protectedCookie = "leo_access_token=test-token"
type NextRequestInit = NonNullable<ConstructorParameters<typeof NextRequest>[1]>

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  })
}

function requestFor(
  method: string,
  path: string,
  init: Omit<NextRequestInit, "method"> = {},
) {
  return new NextRequest(`http://localhost/api/backend${path}`, {
    ...init,
    method,
    headers: {
      Cookie: protectedCookie,
      ...Object.fromEntries(new Headers(init.headers).entries()),
    },
  })
}

function contextFor(path: string) {
  return {
    params: Promise.resolve({ path: path.replace(/^\//, "").split("/") }),
  }
}

async function callRoute(request: NextRequest, path: string) {
  const context = contextFor(path)
  if (request.method === "GET") return GET(request, context)
  if (request.method === "POST") return POST(request, context)
  if (request.method === "PUT") return PUT(request, context)
  if (request.method === "DELETE") return DELETE(request, context)
  throw new Error(`Unsupported test method: ${request.method}`)
}

describe("Knowledge Base backend proxy contract", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it.each([
    ["GET", "/api/v1/knowledge-bases"],
    ["POST", "/api/v1/knowledge-bases"],
    ["GET", "/api/v1/knowledge-bases/1"],
    ["PUT", "/api/v1/knowledge-bases/1"],
    ["DELETE", "/api/v1/knowledge-bases/1"],
    ["PUT", "/api/v1/knowledge-bases/1/config"],
    ["GET", "/api/v1/knowledge-bases/1/documents"],
    ["POST", "/api/v1/knowledge-bases/1/documents"],
    ["GET", "/api/v1/knowledge-bases/1/documents/2"],
    ["DELETE", "/api/v1/knowledge-bases/1/documents/2"],
    ["GET", "/api/v1/knowledge-bases/1/documents/2/download"],
    ["POST", "/api/v1/knowledge-bases/1/documents/2/retry"],
    ["GET", "/api/v1/knowledge-bases/1/documents/2/segments"],
    ["GET", "/api/v1/knowledge-bases/1/segments"],
    ["PUT", "/api/v1/knowledge-bases/1/segments/3"],
    ["DELETE", "/api/v1/knowledge-bases/1/segments/3"],
    ["POST", "/api/v1/knowledge-bases/1/retrieval-test"],
  ])("allows %s %s", (method, path) => {
    expect(isAllowedRoute(method, path)).toBe(true)
  })

  it.each([
    ["PATCH", "/api/v1/knowledge-bases/1"],
    ["GET", "/api/v1/knowledge-bases/not-a-number"],
    ["GET", "/api/v1/knowledge-bases/1/documents/2/private"],
    ["POST", "/api/v1/knowledge-bases/1/documents/2/download"],
    ["GET", "/api/v1/knowledge-bases/1/segments/3"],
    ["GET", "/api/v1/knowledge-bases/1/"],
  ])("rejects %s %s", (method, path) => {
    expect(isAllowedRoute(method, path)).toBe(false)
  })

  it("keeps long timeouts scoped to upload and download", () => {
    expect(
      requestTimeoutMs("POST", "/api/v1/knowledge-bases/1/documents"),
    ).toBe(120_000)
    expect(
      requestTimeoutMs(
        "GET",
        "/api/v1/knowledge-bases/1/documents/2/download",
      ),
    ).toBe(120_000)
    expect(requestTimeoutMs("GET", "/api/v1/knowledge-bases/1")).toBe(
      10_000,
    )
    expect(requestTimeoutMs("POST", "/api/v1/agents/1/invoke")).toBe(
      305_000,
    )
  })

  it("recognizes JSON media types but not document content", () => {
    expect(isJsonContentType("application/json; charset=utf-8")).toBe(true)
    expect(isJsonContentType("application/problem+json")).toBe(true)
    expect(isJsonContentType("text/plain")).toBe(false)
    expect(isJsonContentType(null)).toBe(false)
  })

  it("copies only safe download response headers", () => {
    const headers = downloadResponseHeaders(
      new Headers({
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=document.pdf",
        "Content-Length": "12",
        "Set-Cookie": "upstream=secret",
        "X-Internal-Token": "secret",
      }),
    )

    expect(headers.get("content-type")).toBe("application/pdf")
    expect(headers.get("content-disposition")).toContain("attachment")
    expect(headers.get("content-length")).toBe("12")
    expect(headers.get("cache-control")).toBe("no-store")
    expect(headers.get("x-content-type-options")).toBe("nosniff")
    expect(headers.has("set-cookie")).toBe(false)
    expect(headers.has("x-internal-token")).toBe(false)
  })

  it("requires authentication before contacting protected upstream routes", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const path = "/api/v1/knowledge-bases"
    const request = new NextRequest(`http://localhost/api/backend${path}`)

    const response = await GET(request, contextFor(path))

    expect(response.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("forwards query parameters and authenticates from the session cookie", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        code: 200,
        message: "success",
        data: { items: [], total: 0, page: 2, page_size: 10 },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)
    const path = "/api/v1/knowledge-bases"
    const request = requestFor(
      "GET",
      `${path}?page=2&page_size=10&keyword=docs`,
      { headers: { Authorization: "Bearer client-supplied" } },
    )

    const response = await GET(request, contextFor(path))

    expect(response.status).toBe(200)
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit]
    expect(url.toString()).toBe(
      "http://backend.test:8000/api/v1/knowledge-bases?page=2&page_size=10&keyword=docs",
    )
    expect(new Headers(init.headers).get("authorization")).toBe(
      "Bearer test-token",
    )
  })

  it("streams multipart uploads with the original boundary and bytes", async () => {
    let forwardedContentType: string | null = null
    let forwardedBody = ""
    let forwardedDuplex: unknown = null
    const fetchMock = vi.fn().mockImplementation(
      async (_url: URL, init: RequestInit & { duplex?: "half" }) => {
        forwardedContentType = new Headers(init.headers).get("content-type")
        forwardedBody = await new Response(init.body).text()
        forwardedDuplex = init.duplex
        return jsonResponse({
          code: 200,
          message: "success",
          data: { id: 2, file_name: "notes.txt", status: "pending" },
        })
      },
    )
    vi.stubGlobal("fetch", fetchMock)
    const path = "/api/v1/knowledge-bases/1/documents"
    const boundary = "----leo-proxy-boundary"
    const multipartBody = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="notes.txt"',
      "Content-Type: text/plain",
      "",
      "boundary-safe-content\u0000end",
      `--${boundary}--`,
      "",
    ].join("\r\n")
    const request = requestFor("POST", path, {
      body: new TextEncoder().encode(multipartBody),
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    })
    const originalContentType = request.headers.get("content-type")

    const response = await POST(request, contextFor(path))

    expect(response.status).toBe(200)
    expect(forwardedContentType).toBe(originalContentType)
    expect(forwardedContentType).toMatch(
      /^multipart\/form-data; boundary=/,
    )
    expect(forwardedBody).toContain("notes.txt")
    expect(forwardedBody).toContain("boundary-safe-content\u0000end")
    expect(forwardedDuplex).toBe("half")
  })

  it("streams exact document downloads without JSON decoding", async () => {
    const bytes = new Uint8Array([0, 255, 128, 65, 10])
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition":
            "attachment; filename*=UTF-8''document%20data.bin",
          "Content-Length": String(bytes.byteLength),
          "Set-Cookie": "upstream=secret",
          "X-Internal-Token": "secret",
        },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)
    const path = "/api/v1/knowledge-bases/1/documents/2/download"

    expect(isKnowledgeDownloadRoute("GET", path)).toBe(true)
    const response = await GET(requestFor("GET", path), contextFor(path))

    expect(response.status).toBe(200)
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes)
    expect(response.headers.get("content-type")).toBe(
      "application/octet-stream",
    )
    expect(response.headers.get("content-disposition")).toContain(
      "document%20data.bin",
    )
    expect(response.headers.get("x-content-type-options")).toBe("nosniff")
    expect(response.headers.has("set-cookie")).toBe(false)
    expect(response.headers.has("x-internal-token")).toBe(false)
  })

  it("keeps JSON errors and session clearing on download routes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        { code: 401, message: "登录状态已失效", data: null },
        401,
      ),
    )
    vi.stubGlobal("fetch", fetchMock)
    const path = "/api/v1/knowledge-bases/1/documents/2/download"

    const response = await GET(requestFor("GET", path), contextFor(path))

    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ code: 401 })
    expect(response.headers.get("set-cookie")).toContain(
      "leo_access_token=",
    )
    expect(response.headers.get("set-cookie")?.toLowerCase()).toContain(
      "max-age=0",
    )
  })

  it("rejects unexpected non-JSON responses from regular API routes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("internal details", {
          status: 500,
          headers: { "Content-Type": "text/plain" },
        }),
      ),
    )
    const path = "/api/v1/knowledge-bases"

    const response = await callRoute(requestFor("GET", path), path)

    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({
      code: 502,
      message: "后端返回了非 JSON 数据",
    })
  })
})
