import { z } from "zod"

const apiEnvelopeBaseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.unknown().nullable(),
})

const validationIssueSchema = z.object({
  loc: z.array(z.union([z.string(), z.number()])).optional(),
  msg: z.string(),
})

const validationErrorSchema = z.object({
  detail: z.array(validationIssueSchema),
})

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
    public readonly code = status,
    public readonly issues: string[] = [],
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export function envelopeSchema<T extends z.ZodType>(dataSchema: T) {
  return apiEnvelopeBaseSchema.extend({
    data: dataSchema.nullable(),
  })
}

export function pageSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
  })
}

export type PageResult<T> = {
  items: T[]
  total: number
  page: number
  page_size: number
}

export function messageFromUnknown(payload: unknown, fallback: string) {
  const envelope = apiEnvelopeBaseSchema.safeParse(payload)
  if (envelope.success && envelope.data.message) {
    return envelope.data.message
  }

  const validation = validationErrorSchema.safeParse(payload)
  if (validation.success) {
    return validation.data.detail.map((issue) => issue.msg).join("；")
  }

  return fallback
}

export function parseEnvelope<T>(
  payload: unknown,
  dataSchema: z.ZodType<T>,
  status = 200,
): T {
  const parsed = envelopeSchema(dataSchema).safeParse(payload)

  if (!parsed.success) {
    throw new ApiError("服务端返回了无法识别的数据", status, status, [
      z.prettifyError(parsed.error),
    ])
  }

  if (parsed.data.code < 200 || parsed.data.code >= 300) {
    throw new ApiError(
      parsed.data.message || "请求失败",
      normalizeHttpStatus(parsed.data.code),
      parsed.data.code,
    )
  }

  if (parsed.data.data === null) {
    throw new ApiError("服务端未返回数据", status, parsed.data.code)
  }

  return parsed.data.data
}

export function normalizeHttpStatus(code: number) {
  return code >= 400 && code <= 599 ? code : 400
}
