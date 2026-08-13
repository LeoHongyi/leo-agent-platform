"use client"

import {
  apiDownload,
  apiFormDataRequest,
  apiMutation,
  apiRequest,
  pageQueryString,
  type KnowledgeDocumentListParams,
  type KnowledgeSegmentListParams,
  type ListParams,
} from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import {
  knowledgeBaseConfigSchema,
  knowledgeBaseCreateSchema,
  knowledgeBaseSchema,
  knowledgeBaseUpdateSchema,
  knowledgeDocumentSchema,
  knowledgeSegmentSchema,
  retrievalTestInputSchema,
  retrievalTestResultSchema,
  segmentUpdateSchema,
  type KnowledgeBaseConfigInput,
  type KnowledgeBaseCreateInput,
  type KnowledgeBaseUpdateInput,
  type KnowledgeSegmentUpdateInput,
  type RetrievalTestInput,
} from "@/lib/api/schemas"
import { pageSchema } from "@/lib/api/response"

function documentQueryString(params: KnowledgeDocumentListParams) {
  const search = new URLSearchParams(pageQueryString(params))
  if (params.status) search.set("status", params.status)
  return search.toString()
}

function segmentQueryString(params: KnowledgeSegmentListParams) {
  const search = new URLSearchParams(pageQueryString(params))
  if (params.documentId !== undefined) {
    search.set("document_id", String(params.documentId))
  }
  return search.toString()
}

export const knowledgeBasesApi = {
  list: (params: ListParams) =>
    apiRequest(
      `${endpoints.knowledgeBases}?${pageQueryString(params)}`,
      pageSchema(knowledgeBaseSchema),
    ),
  get: (knowledgeBaseId: number) =>
    apiRequest(
      endpoints.knowledgeBase(knowledgeBaseId),
      knowledgeBaseSchema,
    ),
  create: (input: KnowledgeBaseCreateInput) =>
    apiRequest(endpoints.knowledgeBases, knowledgeBaseSchema, {
      method: "POST",
      body: knowledgeBaseCreateSchema.parse(input),
    }),
  update: (
    knowledgeBaseId: number,
    input: KnowledgeBaseUpdateInput,
  ) =>
    apiRequest(
      endpoints.knowledgeBase(knowledgeBaseId),
      knowledgeBaseSchema,
      {
        method: "PUT",
        body: knowledgeBaseUpdateSchema.parse(input),
      },
    ),
  updateConfig: (
    knowledgeBaseId: number,
    input: KnowledgeBaseConfigInput,
  ) =>
    apiRequest(
      endpoints.knowledgeBaseConfig(knowledgeBaseId),
      knowledgeBaseSchema,
      {
        method: "PUT",
        body: knowledgeBaseConfigSchema.parse(input),
      },
    ),
  remove: (knowledgeBaseId: number) =>
    apiMutation(endpoints.knowledgeBase(knowledgeBaseId), {
      method: "DELETE",
    }),
  listDocuments: (
    knowledgeBaseId: number,
    params: KnowledgeDocumentListParams,
  ) =>
    apiRequest(
      `${endpoints.knowledgeDocuments(knowledgeBaseId)}?${documentQueryString(params)}`,
      pageSchema(knowledgeDocumentSchema),
    ),
  getDocument: (knowledgeBaseId: number, documentId: number) =>
    apiRequest(
      endpoints.knowledgeDocument(knowledgeBaseId, documentId),
      knowledgeDocumentSchema,
    ),
  uploadDocument: (knowledgeBaseId: number, file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    return apiFormDataRequest(
      endpoints.knowledgeDocuments(knowledgeBaseId),
      knowledgeDocumentSchema,
      formData,
      { method: "POST" },
    )
  },
  downloadDocument: (knowledgeBaseId: number, documentId: number) =>
    apiDownload(
      endpoints.knowledgeDocumentDownload(
        knowledgeBaseId,
        documentId,
      ),
    ),
  retryDocument: (knowledgeBaseId: number, documentId: number) =>
    apiRequest(
      endpoints.knowledgeDocumentRetry(knowledgeBaseId, documentId),
      knowledgeDocumentSchema,
      { method: "POST" },
    ),
  removeDocument: (knowledgeBaseId: number, documentId: number) =>
    apiMutation(
      endpoints.knowledgeDocument(knowledgeBaseId, documentId),
      { method: "DELETE" },
    ),
  listSegments: (
    knowledgeBaseId: number,
    params: KnowledgeSegmentListParams,
  ) =>
    apiRequest(
      `${endpoints.knowledgeSegments(knowledgeBaseId)}?${segmentQueryString(params)}`,
      pageSchema(knowledgeSegmentSchema),
    ),
  listDocumentSegments: (
    knowledgeBaseId: number,
    documentId: number,
    params: ListParams,
  ) =>
    apiRequest(
      `${endpoints.knowledgeDocumentSegments(knowledgeBaseId, documentId)}?${pageQueryString(params)}`,
      pageSchema(knowledgeSegmentSchema),
    ),
  updateSegment: (
    knowledgeBaseId: number,
    segmentId: number,
    input: KnowledgeSegmentUpdateInput,
  ) =>
    apiRequest(
      endpoints.knowledgeSegment(knowledgeBaseId, segmentId),
      knowledgeSegmentSchema,
      {
        method: "PUT",
        body: segmentUpdateSchema.parse(input),
      },
    ),
  removeSegment: (knowledgeBaseId: number, segmentId: number) =>
    apiMutation(
      endpoints.knowledgeSegment(knowledgeBaseId, segmentId),
      { method: "DELETE" },
    ),
  testRetrieval: (
    knowledgeBaseId: number,
    input: RetrievalTestInput,
  ) =>
    apiRequest(
      endpoints.knowledgeRetrievalTest(knowledgeBaseId),
      retrievalTestResultSchema.array(),
      {
        method: "POST",
        body: retrievalTestInputSchema.parse(input),
      },
    ),
}
