"use client"

import {
  apiMutation,
  apiRequest,
  pageQueryString,
  type ListParams,
} from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import {
  providerConnectionTestResultSchema,
  providerCreateSchema,
  providerSchema,
  providerUpdateSchema,
  type ProviderCreateInput,
  type ProviderUpdateInput,
} from "@/lib/api/schemas"
import { pageSchema } from "@/lib/api/response"

export const providersApi = {
  list: (params: ListParams) =>
    apiRequest(
      `${endpoints.providers}?${pageQueryString(params)}`,
      pageSchema(providerSchema),
    ),
  get: (providerId: number) =>
    apiRequest(endpoints.provider(providerId), providerSchema),
  create: (input: ProviderCreateInput) =>
    apiRequest(endpoints.providers, providerSchema, {
      method: "POST",
      body: providerCreateSchema.parse(input),
    }),
  update: (providerId: number, input: ProviderUpdateInput) =>
    apiRequest(endpoints.provider(providerId), providerSchema, {
      method: "PUT",
      body: providerUpdateSchema.parse(input),
    }),
  remove: (providerId: number) =>
    apiMutation(endpoints.provider(providerId), { method: "DELETE" }),
  testConnection: (providerId: number) =>
    apiRequest(
      endpoints.providerTest(providerId),
      providerConnectionTestResultSchema,
      { method: "POST" },
    ),
}
