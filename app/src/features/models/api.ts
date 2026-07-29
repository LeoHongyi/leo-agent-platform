"use client"

import {
  apiMutation,
  apiRequest,
  pageQueryString,
  type ModelListParams,
} from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import {
  modelCreateSchema,
  modelSchema,
  modelUpdateSchema,
  type ModelCreateInput,
  type ModelUpdateInput,
} from "@/lib/api/schemas"
import { pageSchema } from "@/lib/api/response"

function modelQueryString(params: ModelListParams) {
  const search = new URLSearchParams(pageQueryString(params))
  if (params.providerId) {
    search.set("provider_id", String(params.providerId))
  }
  return search.toString()
}

export const modelsApi = {
  list: (params: ModelListParams) =>
    apiRequest(
      `${endpoints.models}?${modelQueryString(params)}`,
      pageSchema(modelSchema),
    ),
  get: (modelId: number) =>
    apiRequest(endpoints.model(modelId), modelSchema),
  create: (input: ModelCreateInput) =>
    apiRequest(endpoints.models, modelSchema, {
      method: "POST",
      body: modelCreateSchema.parse(input),
    }),
  update: (modelId: number, input: ModelUpdateInput) =>
    apiRequest(endpoints.model(modelId), modelSchema, {
      method: "PUT",
      body: modelUpdateSchema.parse(input),
    }),
  remove: (modelId: number) =>
    apiMutation(endpoints.model(modelId), { method: "DELETE" }),
}
