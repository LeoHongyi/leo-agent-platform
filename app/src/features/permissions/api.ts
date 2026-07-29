"use client"

import {
  apiMutation,
  apiRequest,
  pageQueryString,
  type ListParams,
} from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import {
  permissionCreateSchema,
  permissionSchema,
  permissionUpdateSchema,
  type PermissionCreateInput,
  type PermissionUpdateInput,
} from "@/lib/api/schemas"
import { pageSchema } from "@/lib/api/response"

export const permissionsApi = {
  list: (params: ListParams) =>
    apiRequest(
      `${endpoints.permissions}?${pageQueryString(params)}`,
      pageSchema(permissionSchema),
    ),
  create: (input: PermissionCreateInput) =>
    apiRequest(endpoints.permissions, permissionSchema, {
      method: "POST",
      body: permissionCreateSchema.parse(input),
    }),
  update: (permissionId: number, input: PermissionUpdateInput) =>
    apiRequest(endpoints.permission(permissionId), permissionSchema, {
      method: "PUT",
      body: permissionUpdateSchema.parse(input),
    }),
  remove: (permissionId: number) =>
    apiMutation(endpoints.permission(permissionId), { method: "DELETE" }),
}
