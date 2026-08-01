import type { ListParams, ModelListParams } from "@/lib/api/client"

export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
    access: ["auth", "access"] as const,
  },
  users: {
    all: ["users"] as const,
    list: (params: ListParams) => ["users", "list", params] as const,
    roles: (userId: number) => ["users", userId, "roles"] as const,
  },
  roles: {
    all: ["roles"] as const,
    list: (params: ListParams) => ["roles", "list", params] as const,
  },
  permissions: {
    all: ["permissions"] as const,
    list: (params: ListParams) =>
      ["permissions", "list", params] as const,
  },
  providers: {
    all: ["providers"] as const,
    list: (params: ListParams) => ["providers", "list", params] as const,
    detail: (providerId: number) =>
      ["providers", "detail", providerId] as const,
  },
  models: {
    all: ["models"] as const,
    list: (params: ModelListParams) =>
      ["models", "list", params] as const,
    detail: (modelId: number) =>
      ["models", "detail", modelId] as const,
  },
  prompts: {
    all: ["prompts"] as const,
    list: (params: ListParams) => ["prompts", "list", params] as const,
    detail: (promptId: number) =>
      ["prompts", "detail", promptId] as const,
    versions: (promptId: number) =>
      ["prompts", promptId, "versions"] as const,
  },
  tools: {
    all: ["tools"] as const,
    list: (params: ListParams) => ["tools", "list", params] as const,
    detail: (toolId: number) =>
      ["tools", "detail", toolId] as const,
  },
  knowledgeBases: {
    all: ["knowledge-bases"] as const,
    list: (params: ListParams) =>
      ["knowledge-bases", "list", params] as const,
  },
  agents: {
    all: ["agents"] as const,
    list: (params: ListParams) => ["agents", "list", params] as const,
    detail: (agentId: number) =>
      ["agents", "detail", agentId] as const,
    versions: (agentId: number) =>
      ["agents", agentId, "versions"] as const,
  },
} as const
