"use client"

import {
  apiMutation,
  apiRequest,
  pageQueryString,
  type ListParams,
} from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import {
  toolCreateSchema,
  toolSchema,
  toolTestInputSchema,
  toolTestResultSchema,
  toolUpdateSchema,
  type ToolCreateInput,
  type ToolTestInput,
  type ToolUpdateInput,
} from "@/lib/api/schemas"
import { pageSchema } from "@/lib/api/response"

export const toolsApi = {
  list: (params: ListParams) =>
    apiRequest(
      `${endpoints.tools}?${pageQueryString(params)}`,
      pageSchema(toolSchema),
    ),
  get: (toolId: number) =>
    apiRequest(endpoints.tool(toolId), toolSchema),
  create: (input: ToolCreateInput) =>
    apiRequest(endpoints.tools, toolSchema, {
      method: "POST",
      body: toolCreateSchema.parse(input),
    }),
  update: (toolId: number, input: ToolUpdateInput) =>
    apiRequest(endpoints.tool(toolId), toolSchema, {
      method: "PUT",
      body: toolUpdateSchema.parse(input),
    }),
  remove: (toolId: number) =>
    apiMutation(endpoints.tool(toolId), { method: "DELETE" }),
  enable: (toolId: number) =>
    apiRequest(endpoints.toolEnable(toolId), toolSchema, {
      method: "POST",
    }),
  disable: (toolId: number) =>
    apiRequest(endpoints.toolDisable(toolId), toolSchema, {
      method: "POST",
    }),
  test: (toolId: number, input: ToolTestInput) =>
    apiRequest(endpoints.toolTest(toolId), toolTestResultSchema, {
      method: "POST",
      body: toolTestInputSchema.parse(input),
    }),
}
