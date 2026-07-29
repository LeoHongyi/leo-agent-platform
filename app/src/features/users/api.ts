"use client"

import { z } from "zod"

import {
  apiRequest,
  pageQueryString,
  type ListParams,
} from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import {
  userSchema,
  userWithRolesSchema,
  type UserCreateInput,
} from "@/lib/api/schemas"
import { pageSchema } from "@/lib/api/response"

export const usersApi = {
  list: (params: ListParams) =>
    apiRequest(
      `${endpoints.users}?${pageQueryString(params)}`,
      pageSchema(userSchema),
    ),
  create: (input: UserCreateInput) =>
    apiRequest(endpoints.users, userSchema, {
      method: "POST",
      body: input,
    }),
  roles: async (userId: number) => {
    const users = await apiRequest(
      endpoints.userRoles(userId),
      z.array(userWithRolesSchema),
    )
    return users[0]?.roles ?? []
  },
  assignRoles: (userId: number, roleIds: number[]) =>
    apiRequest(endpoints.userRoles(userId), userWithRolesSchema, {
      method: "PUT",
      body: { role_ids: roleIds },
    }),
}
