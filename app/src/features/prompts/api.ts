"use client"

import { z } from "zod"

import {
  apiMutation,
  apiRequest,
  pageQueryString,
  type ListParams,
} from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import { pageSchema } from "@/lib/api/response"
import {
  promptCreateSchema,
  promptPublishSchema,
  promptRollbackSchema,
  promptSchema,
  promptUpdateSchema,
  promptVersionSchema,
  type PromptCreateInput,
  type PromptPublishInput,
  type PromptRollbackInput,
  type PromptUpdateInput,
} from "@/lib/api/schemas"

export const promptsApi = {
  list: (params: ListParams) =>
    apiRequest(
      `${endpoints.prompts}?${pageQueryString(params)}`,
      pageSchema(promptSchema),
    ),
  get: (promptId: number) =>
    apiRequest(endpoints.prompt(promptId), promptSchema),
  create: (input: PromptCreateInput) =>
    apiRequest(endpoints.prompts, promptSchema, {
      method: "POST",
      body: promptCreateSchema.parse(input),
    }),
  update: (promptId: number, input: PromptUpdateInput) =>
    apiRequest(endpoints.prompt(promptId), promptSchema, {
      method: "PUT",
      body: promptUpdateSchema.parse(input),
    }),
  remove: (promptId: number) =>
    apiMutation(endpoints.prompt(promptId), { method: "DELETE" }),
  publish: (promptId: number, input: PromptPublishInput) =>
    apiRequest(endpoints.promptPublish(promptId), promptSchema, {
      method: "POST",
      body: promptPublishSchema.parse(input),
    }),
  versions: (promptId: number) =>
    apiRequest(
      endpoints.promptVersions(promptId),
      z.array(promptVersionSchema),
    ),
  rollback: (promptId: number, input: PromptRollbackInput) =>
    apiRequest(endpoints.promptRollback(promptId), promptSchema, {
      method: "POST",
      body: promptRollbackSchema.parse(input),
    }),
}
