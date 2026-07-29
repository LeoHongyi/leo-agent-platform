"use client"

import {
  apiMutation,
  apiRequest,
  pageQueryString,
  type ListParams,
} from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import {
  roleCreateSchema,
  roleSchema,
  roleUpdateSchema,
  type RoleCreateInput,
  type RoleUpdateInput,
} from "@/lib/api/schemas"
import { pageSchema } from "@/lib/api/response"

export const rolesApi = {
  list: (params: ListParams) =>
    apiRequest(
      `${endpoints.roles}?${pageQueryString(params)}`,
      pageSchema(roleSchema),
    ),
  create: (input: RoleCreateInput) =>
    apiRequest(endpoints.roles, roleSchema, {
      method: "POST",
      body: roleCreateSchema.parse(input),
    }),
  update: (roleId: number, input: RoleUpdateInput) =>
    apiRequest(endpoints.role(roleId), roleSchema, {
      method: "PUT",
      body: roleUpdateSchema.parse(input),
    }),
  remove: (roleId: number) =>
    apiMutation(endpoints.role(roleId), { method: "DELETE" }),
  assignPermissions: (roleId: number, permissionIds: number[]) =>
    apiRequest(endpoints.rolePermissions(roleId), roleSchema, {
      method: "PUT",
      body: { permission_ids: permissionIds },
    }),
}
