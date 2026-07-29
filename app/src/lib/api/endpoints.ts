export const endpoints = {
  login: "/api/auth/login",
  logout: "/api/auth/logout",
  captcha: "/api/backend/api/v1/captcha",
  access: "/api/backend/api/v1/auth/access",
  me: "/api/backend/api/v1/users/me",
  users: "/api/backend/api/v1/users",
  userRoles: (userId: number) =>
    `/api/backend/api/v1/users/${userId}/roles`,
  roles: "/api/backend/api/v1/roles",
  role: (roleId: number) => `/api/backend/api/v1/roles/${roleId}`,
  rolePermissions: (roleId: number) =>
    `/api/backend/api/v1/roles/${roleId}/permissions`,
  permissions: "/api/backend/api/v1/permissions",
  permission: (permissionId: number) =>
    `/api/backend/api/v1/permissions/${permissionId}`,
  providers: "/api/backend/api/v1/providers",
  provider: (providerId: number) =>
    `/api/backend/api/v1/providers/${providerId}`,
  providerTest: (providerId: number) =>
    `/api/backend/api/v1/providers/${providerId}/test`,
  models: "/api/backend/api/v1/models",
  model: (modelId: number) =>
    `/api/backend/api/v1/models/${modelId}`,
  prompts: "/api/backend/api/v1/prompts",
  prompt: (promptId: number) =>
    `/api/backend/api/v1/prompts/${promptId}`,
  promptPublish: (promptId: number) =>
    `/api/backend/api/v1/prompts/${promptId}/publish`,
  promptVersions: (promptId: number) =>
    `/api/backend/api/v1/prompts/${promptId}/versions`,
  promptRollback: (promptId: number) =>
    `/api/backend/api/v1/prompts/${promptId}/rollback`,
  tools: "/api/backend/api/v1/tools",
  tool: (toolId: number) =>
    `/api/backend/api/v1/tools/${toolId}`,
  toolEnable: (toolId: number) =>
    `/api/backend/api/v1/tools/${toolId}/enable`,
  toolDisable: (toolId: number) =>
    `/api/backend/api/v1/tools/${toolId}/disable`,
  toolTest: (toolId: number) =>
    `/api/backend/api/v1/tools/${toolId}/test`,
} as const
