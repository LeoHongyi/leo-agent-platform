"use client"

import {
  apiMutation,
  apiRequest,
  pageQueryString,
  type ListParams,
} from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import {
  agentCreateSchema,
  agentInvokeResultSchema,
  agentInvokeSchema,
  agentPublishSchema,
  agentRollbackSchema,
  agentSchema,
  agentUpdateSchema,
  agentVersionSchema,
  type AgentCreateInput,
  type AgentInvokeInput,
  type AgentPublishInput,
  type AgentRollbackInput,
  type AgentUpdateInput,
} from "@/lib/api/schemas"
import { pageSchema } from "@/lib/api/response"

export const agentsApi = {
  list: (params: ListParams) =>
    apiRequest(
      `${endpoints.agents}?${pageQueryString(params)}`,
      pageSchema(agentSchema),
    ),
  get: (agentId: number) =>
    apiRequest(endpoints.agent(agentId), agentSchema),
  create: (input: AgentCreateInput) =>
    apiRequest(endpoints.agents, agentSchema, {
      method: "POST",
      body: agentCreateSchema.parse(input),
    }),
  update: (agentId: number, input: AgentUpdateInput) =>
    apiRequest(endpoints.agent(agentId), agentSchema, {
      method: "PUT",
      body: agentUpdateSchema.parse(input),
    }),
  remove: (agentId: number) =>
    apiMutation(endpoints.agent(agentId), { method: "DELETE" }),
  start: (agentId: number) =>
    apiRequest(endpoints.agentStart(agentId), agentSchema, {
      method: "POST",
    }),
  stop: (agentId: number) =>
    apiRequest(endpoints.agentStop(agentId), agentSchema, {
      method: "POST",
    }),
  publish: (agentId: number, input: AgentPublishInput) =>
    apiRequest(endpoints.agentPublish(agentId), agentSchema, {
      method: "POST",
      body: agentPublishSchema.parse(input),
    }),
  versions: (agentId: number) =>
    apiRequest(
      endpoints.agentVersions(agentId),
      agentVersionSchema.array(),
    ),
  rollback: (agentId: number, input: AgentRollbackInput) =>
    apiRequest(endpoints.agentRollback(agentId), agentSchema, {
      method: "POST",
      body: agentRollbackSchema.parse(input),
    }),
  invoke: (agentId: number, input: AgentInvokeInput) =>
    apiRequest(endpoints.agentInvoke(agentId), agentInvokeResultSchema, {
      method: "POST",
      body: agentInvokeSchema.parse(input),
    }),
}
