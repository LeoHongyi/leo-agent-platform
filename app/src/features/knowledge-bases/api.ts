"use client"

import {
  apiRequest,
  pageQueryString,
  type ListParams,
} from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import { knowledgeBaseSchema } from "@/lib/api/schemas"
import { pageSchema } from "@/lib/api/response"

export const knowledgeBasesApi = {
  list: (params: ListParams) =>
    apiRequest(
      `${endpoints.knowledgeBases}?${pageQueryString(params)}`,
      pageSchema(knowledgeBaseSchema),
    ),
}
