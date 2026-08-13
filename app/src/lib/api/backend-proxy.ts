const publicRoutes = new Set([
  "GET /api/v1/captcha",
  "POST /api/v1/captcha/verify",
  "GET /health",
])

const allowedRoutes = [
  /^(GET|POST) \/api\/v1\/users$/,
  /^(GET) \/api\/v1\/users\/me$/,
  /^(GET) \/api\/v1\/users\/\d+$/,
  /^(GET|PUT) \/api\/v1\/users\/\d+\/roles$/,
  /^(GET) \/api\/v1\/auth\/access$/,
  /^(GET|POST) \/api\/v1\/permissions\/?$/,
  /^(GET|PUT|DELETE) \/api\/v1\/permissions\/\d+$/,
  /^(GET|POST) \/api\/v1\/roles$/,
  /^(GET|PUT|DELETE) \/api\/v1\/roles\/\d+$/,
  /^(PUT) \/api\/v1\/roles\/\d+\/permissions$/,
  /^(GET|POST) \/api\/v1\/providers$/,
  /^(GET|PUT|DELETE) \/api\/v1\/providers\/\d+$/,
  /^(POST) \/api\/v1\/providers\/\d+\/test$/,
  /^(GET|POST) \/api\/v1\/models$/,
  /^(GET|PUT|DELETE) \/api\/v1\/models\/\d+$/,
  /^(GET|POST) \/api\/v1\/prompts$/,
  /^(GET|PUT|DELETE) \/api\/v1\/prompts\/\d+$/,
  /^(POST) \/api\/v1\/prompts\/\d+\/(?:publish|rollback)$/,
  /^(GET) \/api\/v1\/prompts\/\d+\/versions$/,
  /^(GET|POST) \/api\/v1\/tools$/,
  /^(GET|PUT|DELETE) \/api\/v1\/tools\/\d+$/,
  /^(POST) \/api\/v1\/tools\/\d+\/(?:enable|disable|test)$/,
  /^(GET|POST) \/api\/v1\/knowledge-bases$/,
  /^(GET|PUT|DELETE) \/api\/v1\/knowledge-bases\/\d+$/,
  /^(PUT) \/api\/v1\/knowledge-bases\/\d+\/config$/,
  /^(GET|POST) \/api\/v1\/knowledge-bases\/\d+\/documents$/,
  /^(GET|DELETE) \/api\/v1\/knowledge-bases\/\d+\/documents\/\d+$/,
  /^(GET) \/api\/v1\/knowledge-bases\/\d+\/documents\/\d+\/download$/,
  /^(POST) \/api\/v1\/knowledge-bases\/\d+\/documents\/\d+\/retry$/,
  /^(GET) \/api\/v1\/knowledge-bases\/\d+\/documents\/\d+\/segments$/,
  /^(GET) \/api\/v1\/knowledge-bases\/\d+\/segments$/,
  /^(PUT|DELETE) \/api\/v1\/knowledge-bases\/\d+\/segments\/\d+$/,
  /^(POST) \/api\/v1\/knowledge-bases\/\d+\/retrieval-test$/,
  /^(GET|POST) \/api\/v1\/agents$/,
  /^(GET|PUT|DELETE) \/api\/v1\/agents\/\d+$/,
  /^(POST) \/api\/v1\/agents\/\d+\/(?:start|stop|publish|rollback|invoke)$/,
  /^(GET) \/api\/v1\/agents\/\d+\/versions$/,
  /^(GET|POST) \/api\/v1\/captcha(?:\/verify)?$/,
  /^(GET) \/health$/,
]

const knowledgeDownloadRoute =
  /^GET \/api\/v1\/knowledge-bases\/\d+\/documents\/\d+\/download$/
const knowledgeUploadRoute =
  /^POST \/api\/v1\/knowledge-bases\/\d+\/documents$/
const agentInvokeRoute = /^POST \/api\/v1\/agents\/\d+\/invoke$/

export function routeKey(method: string, path: string) {
  return `${method.toUpperCase()} ${path}`
}

export function isAllowedRoute(method: string, path: string) {
  const key = routeKey(method, path)
  return allowedRoutes.some((pattern) => pattern.test(key))
}

export function isPublicRoute(method: string, path: string) {
  return publicRoutes.has(routeKey(method, path))
}

export function isKnowledgeDownloadRoute(method: string, path: string) {
  return knowledgeDownloadRoute.test(routeKey(method, path))
}

export function requestTimeoutMs(method: string, path: string) {
  const key = routeKey(method, path)
  if (agentInvokeRoute.test(key)) return 305_000
  if (knowledgeUploadRoute.test(key) || knowledgeDownloadRoute.test(key)) {
    return 120_000
  }
  return 10_000
}

export function isJsonContentType(contentType: string | null) {
  if (!contentType) return false
  const mediaType = contentType.split(";", 1)[0]?.trim().toLowerCase()
  return mediaType === "application/json" || mediaType?.endsWith("+json")
}

export function downloadResponseHeaders(upstreamHeaders: Headers) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  })

  for (const name of [
    "content-type",
    "content-disposition",
    "content-length",
  ]) {
    const value = upstreamHeaders.get(name)
    if (value) headers.set(name, value)
  }

  return headers
}

export function readBusinessCode(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "code" in payload &&
    typeof payload.code === "number"
  ) {
    return payload.code
  }
  return null
}
