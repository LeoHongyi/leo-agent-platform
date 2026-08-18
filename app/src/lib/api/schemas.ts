import { z } from "zod"

export const permissionSchema = z.object({
  id: z.number().int().positive(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
})

export const roleSchema = z.object({
  id: z.number().int().positive(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  permissions: z.array(permissionSchema).default([]),
})

export const userSchema = z.object({
  id: z.number().int().positive(),
  username: z.string(),
  email: z.string(),
  is_active: z.boolean(),
})

export const userWithRolesSchema = userSchema.extend({
  roles: z.array(roleSchema).default([]),
})

export const accessCodesSchema = z.object({
  permissions: z.array(z.string()),
  roles: z.array(z.string()),
})

export const captchaSchema = z.object({
  key: z.string().min(1),
  image: z.string().min(1),
})

export const tokenSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().default("bearer"),
})

export const loginSchema = z.object({
  username: z.string().trim().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
  captcha_key: z.string().min(1, "请刷新验证码"),
  captcha_code: z.string().trim().min(1, "请输入验证码"),
})

export const userCreateSchema = z.object({
  username: z.string().trim().min(2, "用户名至少 2 个字符").max(50),
  email: z.email("请输入有效邮箱"),
  password: z.string().min(6, "密码至少 6 个字符").max(128),
})

const optionalDescription = z
  .string()
  .trim()
  .max(255, "描述不能超过 255 个字符")
  .optional()

export const roleCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "角色标识至少 2 个字符")
    .max(50)
    .regex(/^[a-z][a-z0-9_-]*$/, "请使用小写字母、数字、下划线或短横线"),
  name: z.string().trim().min(1, "请输入角色名称").max(50),
  description: optionalDescription,
})

export const roleUpdateSchema = z.object({
  name: z.string().trim().min(1, "请输入角色名称").max(50),
  description: optionalDescription,
})

export const permissionCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "权限标识至少 3 个字符")
    .max(100)
    .regex(
      /^[a-z][a-z0-9_-]*:[a-z][a-z0-9_-]*$/,
      "请使用 resource:action 格式",
    ),
  name: z.string().trim().min(1, "请输入权限名称").max(50),
  description: optionalDescription,
})

export const permissionUpdateSchema = z.object({
  name: z.string().trim().min(1, "请输入权限名称").max(50),
  description: optionalDescription,
})

export const providerTypeSchema = z.enum([
  "openai",
  "anthropic",
  "aliyun",
  "azure",
  "local",
  "custom",
])

export const providerStatusSchema = z.enum([
  "connected",
  "disconnected",
  "error",
])

export const providerEndpointSchema = z
  .string()
  .trim()
  .min(1, "请输入 API 地址")
  .max(500, "API 地址不能超过 500 个字符")
  .refine((value) => {
    try {
      return ["http:", "https:"].includes(new URL(value).protocol)
    } catch {
      return false
    }
  }, "请输入有效的 HTTP 或 HTTPS 地址")

export const providerSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  type: providerTypeSchema,
  status: providerStatusSchema,
  endpoint: providerEndpointSchema,
  description: z.string().nullable(),
  model_count: z.number().int().nonnegative(),
})

export const providerCreateSchema = z.object({
  name: z.string().trim().min(1, "请输入供应商名称").max(100),
  type: providerTypeSchema,
  endpoint: providerEndpointSchema,
  api_key: z.string().max(10_000, "API Key 过长").optional(),
  description: z
    .string()
    .trim()
    .max(500, "描述不能超过 500 个字符")
    .nullable()
    .optional(),
})

export const providerUpdateSchema = providerCreateSchema.partial().extend({
  api_key: z.string().max(10_000, "API Key 过长").nullable().optional(),
})

export const providerFormSchema = z.object({
  name: z.string().trim().min(1, "请输入供应商名称").max(100),
  type: providerTypeSchema,
  endpoint: providerEndpointSchema,
  api_key: z.string().max(10_000, "API Key 过长"),
  description: z
    .string()
    .trim()
    .max(500, "描述不能超过 500 个字符"),
  clear_api_key: z.boolean(),
})

export const providerConnectionTestResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  latency_ms: z.number().int().nonnegative(),
  status_code: z.number().int().nullable(),
})

export const modelStatusSchema = z.enum([
  "available",
  "unavailable",
  "rate_limited",
])

const capabilitySchema = z
  .string()
  .trim()
  .min(1, "能力标签不能为空")
  .max(50, "单个能力标签不能超过 50 个字符")
  .refine((value) => !value.includes(","), "能力标签不能包含逗号")

const capabilitiesSchema = z
  .array(capabilitySchema)
  .max(20, "能力标签不能超过 20 个")
  .refine(
    (values) => values.join(",").length <= 500,
    "能力标签总长度不能超过 500 个字符",
  )

const modelNameSchema = z
  .string()
  .trim()
  .min(1, "请输入模型名称")
  .max(100, "模型名称不能超过 100 个字符")

const modelIdentifierSchema = z
  .string()
  .trim()
  .min(1, "请输入模型标识")
  .max(100, "模型标识不能超过 100 个字符")

const modelPriceSchema = z
  .number("请输入有效价格")
  .min(0, "价格不能为负数")
  .max(9_999.999999, "价格超出支持范围")

const currencySchema = z
  .string()
  .trim()
  .min(3, "货币代码至少 3 个字符")
  .max(10, "货币代码不能超过 10 个字符")
  .regex(/^[a-z][a-z0-9_-]*$/i, "请输入有效货币代码")

export const modelSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  model_id: z.string(),
  provider_id: z.number().int().positive(),
  provider_name: z.string(),
  capabilities: z.array(z.string()).default([]),
  context_length: z.number().int().positive(),
  status: modelStatusSchema,
  input_price: z.number().nonnegative(),
  output_price: z.number().nonnegative(),
  currency: z.string(),
  is_default: z.boolean(),
  description: z.string().nullable(),
})

export const modelCreateSchema = z.object({
  name: modelNameSchema,
  model_id: modelIdentifierSchema,
  provider_id: z.number().int().positive("请选择供应商"),
  capabilities: capabilitiesSchema,
  context_length: z
    .number("请输入上下文长度")
    .int("上下文长度必须是整数")
    .positive("上下文长度必须大于 0"),
  input_price: modelPriceSchema,
  output_price: modelPriceSchema,
  currency: currencySchema,
  is_default: z.boolean(),
  description: z
    .string()
    .trim()
    .max(2_000, "描述不能超过 2000 个字符")
    .nullable()
    .optional(),
})

export const modelUpdateSchema = modelCreateSchema
  .omit({ model_id: true, provider_id: true })
  .partial()
  .extend({
    status: modelStatusSchema.optional(),
    description: z
      .string()
      .trim()
      .max(2_000, "描述不能超过 2000 个字符")
      .nullable()
      .optional(),
  })

export const modelFormSchema = z.object({
  name: modelNameSchema,
  model_id: modelIdentifierSchema,
  provider_id: z.number().int().positive("请选择供应商"),
  capabilities: z
    .string()
    .trim()
    .max(500, "能力标签总长度不能超过 500 个字符")
    .refine((value) => {
      const items = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
      return (
        items.length <= 20 &&
        items.every((item) => item.length <= 50 && !item.includes(","))
      )
    }, "最多 20 个标签，单个标签不能超过 50 个字符"),
  context_length: z
    .number("请输入上下文长度")
    .int("上下文长度必须是整数")
    .positive("上下文长度必须大于 0"),
  status: modelStatusSchema,
  input_price: modelPriceSchema,
  output_price: modelPriceSchema,
  currency: currencySchema,
  is_default: z.boolean(),
  description: z
    .string()
    .trim()
    .max(2_000, "描述不能超过 2000 个字符"),
})

export const promptStatusSchema = z.enum(["draft", "published"])
export const promptVariableTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "text",
])

const promptNameSchema = z
  .string()
  .trim()
  .min(1, "请输入 Prompt 名称")
  .max(200, "Prompt 名称不能超过 200 个字符")

const promptCategorySchema = z
  .string()
  .trim()
  .min(1, "请输入分类")
  .max(50, "分类不能超过 50 个字符")

const promptContentSchema = z
  .string()
  .min(1, "请输入 Prompt 内容")
  .refine((value) => Boolean(value.trim()), "Prompt 内容不能为空")

export const promptVariableSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "请输入变量名")
    .max(100, "变量名不能超过 100 个字符"),
  type: promptVariableTypeSchema,
  description: z.string().max(500, "变量说明不能超过 500 个字符"),
  default_value: z
    .string()
    .max(2_000, "默认值不能超过 2000 个字符")
    .nullable(),
  required: z.boolean(),
})

const promptTagsSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1, "标签不能为空")
      .max(50, "单个标签不能超过 50 个字符"),
  )
  .max(50, "标签不能超过 50 个")

export const promptSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  tags: z.array(z.string()).default([]),
  content: z.string(),
  variables: z.array(promptVariableSchema).default([]),
  version: z.string().nullable(),
  status: promptStatusSchema,
  created_by: z.string().nullable(),
  current_version_id: z.number().int().positive().nullable(),
})

export const promptVersionSchema = z.object({
  id: z.number().int().positive(),
  prompt_id: z.number().int().positive(),
  version: z.string(),
  content: z.string(),
  variables: z.array(promptVariableSchema).default([]),
  changelog: z.string().nullable(),
  is_current: z.boolean(),
  published_by: z.string().nullable(),
  published_at: z.iso.datetime({ local: true }).nullable(),
})

export const promptCreateSchema = z.object({
  name: promptNameSchema,
  description: z.string().max(500, "描述不能超过 500 个字符").nullable(),
  category: promptCategorySchema,
  tags: promptTagsSchema,
  content: promptContentSchema,
  variables: z.array(promptVariableSchema).max(100, "变量不能超过 100 个"),
})

export const promptUpdateSchema = promptCreateSchema.partial()

export const promptPublishSchema = z.object({
  changelog: z.string().max(500, "变更说明不能超过 500 个字符"),
})

export const promptRollbackSchema = z.object({
  version_id: z.number().int().positive(),
})

export const promptFormSchema = z.object({
  name: promptNameSchema,
  description: z.string().max(500, "描述不能超过 500 个字符"),
  category: promptCategorySchema,
  tags: z
    .string()
    .max(2_549, "标签内容过长")
    .refine((value) => {
      const tags = value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
      return tags.length <= 50 && tags.every((tag) => tag.length <= 50)
    }, "最多 50 个标签，单个标签不能超过 50 个字符"),
  content: promptContentSchema,
  variables: z
    .array(
      promptVariableSchema.extend({
        default_value: z
          .string()
          .max(2_000, "默认值不能超过 2000 个字符"),
      }),
    )
    .max(100, "变量不能超过 100 个"),
})

export const toolTypeSchema = z.enum([
  "builtin",
  "http_api",
  "custom_function",
])

export const toolStatusSchema = z.enum(["disabled", "enabled", "error"])

const jsonObjectTextSchema = z.string().refine((value) => {
  if (!value.trim()) return true
  try {
    const parsed: unknown = JSON.parse(value)
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    )
  } catch {
    return false
  }
}, "请输入有效的 JSON 对象")

export const toolFunctionDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  parameters: z.record(z.string(), z.unknown()),
})

export const toolSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  description: z.string().nullable(),
  type: toolTypeSchema,
  status: toolStatusSchema,
  config: z.record(z.string(), z.unknown()).nullable(),
  function_definition: toolFunctionDefinitionSchema.nullable(),
  call_count_7d: z.number().int().nonnegative(),
  success_rate: z.number().min(0).max(100),
  avg_latency: z.number().nonnegative(),
  created_by: z.string().nullable(),
})

export const toolCreateSchema = z.object({
  name: z.string().trim().min(1, "请输入工具名称").max(200),
  description: z.string().trim().max(5_000, "描述不能超过 5000 个字符").nullable(),
  type: toolTypeSchema,
  config: z.record(z.string(), z.unknown()).nullable(),
  function_definition: toolFunctionDefinitionSchema.nullable(),
})

export const toolUpdateSchema = toolCreateSchema.partial()

export const toolTestInputSchema = z.object({
  input: z.record(z.string(), z.unknown()),
})

export const toolTestResultSchema = z.object({
  success: z.boolean(),
  output: z.record(z.string(), z.unknown()).nullable(),
  error: z.string().nullable(),
  latency_ms: z.number().int().nonnegative(),
  status_code: z.number().int().nullable(),
})

export const toolFormSchema = z
  .object({
    name: z.string().trim().min(1, "请输入工具名称").max(200),
    description: z.string().trim().max(5_000, "描述不能超过 5000 个字符"),
    type: toolTypeSchema,
    config_json: jsonObjectTextSchema,
    function_name: z.string().trim().max(200, "函数名称不能超过 200 个字符"),
    function_description: z
      .string()
      .trim()
      .max(1_000, "函数说明不能超过 1000 个字符"),
    parameters_json: jsonObjectTextSchema,
  })
  .superRefine((value, context) => {
    const hasFunctionDefinition = Boolean(
      value.function_name ||
        value.function_description ||
        value.parameters_json.trim(),
    )
    if (!hasFunctionDefinition) return

    if (!value.function_name) {
      context.addIssue({
        code: "custom",
        path: ["function_name"],
        message: "请输入函数名称",
      })
    }
    if (!value.function_description) {
      context.addIssue({
        code: "custom",
        path: ["function_description"],
        message: "请输入函数说明",
      })
    }
    if (!value.parameters_json.trim()) {
      context.addIssue({
        code: "custom",
        path: ["parameters_json"],
        message: "请输入参数 Schema",
      })
    }
  })

export const knowledgeBaseStatusSchema = z.enum([
  "empty",
  "indexing",
  "ready",
  "error",
])
export const documentStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
])
export const chunkMethodSchema = z.enum([
  "fixed",
  "sentence",
  "paragraph",
])
export const retrievalStrategySchema = z.enum([
  "keyword",
  "semantic",
  "hybrid",
])

const knowledgeBaseNameSchema = z
  .string()
  .trim()
  .min(1, "请输入知识库名称")
  .max(200, "知识库名称不能超过 200 个字符")

const embeddingModelSchema = z
  .string()
  .trim()
  .min(1, "请输入嵌入模型")
  .max(100, "嵌入模型不能超过 100 个字符")

const knowledgeDescriptionSchema = z
  .string()
  .max(500, "描述不能超过 500 个字符")
  .transform((value) => value.trim() || null)
  .nullable()

const chunkConfigFields = {
  embedding_model: embeddingModelSchema,
  chunk_method: chunkMethodSchema,
  chunk_size: z
    .number("请输入分段大小")
    .int("分段大小必须是整数")
    .min(100, "分段大小不能小于 100")
    .max(2_000, "分段大小不能超过 2000"),
  chunk_overlap: z
    .number("请输入重叠大小")
    .int("重叠大小必须是整数")
    .min(0, "重叠大小不能小于 0")
    .max(500, "重叠大小不能超过 500"),
  retrieval_strategy: retrievalStrategySchema,
  top_k: z
    .number("请输入返回数量")
    .int("返回数量必须是整数")
    .min(1, "返回数量不能小于 1")
    .max(20, "返回数量不能超过 20"),
  similarity_threshold: z
    .number("请输入相似度阈值")
    .min(0, "相似度阈值不能小于 0")
    .max(1, "相似度阈值不能超过 1"),
}

function validateChunkOverlap(
  value: { chunk_size?: number; chunk_overlap?: number },
  context: z.RefinementCtx,
) {
  if (
    value.chunk_size !== undefined &&
    value.chunk_overlap !== undefined &&
    value.chunk_overlap >= value.chunk_size
  ) {
    context.addIssue({
      code: "custom",
      path: ["chunk_overlap"],
      message: "重叠大小必须小于分段大小",
    })
  }
}

export const knowledgeBaseCreateSchema = z
  .object({
    name: knowledgeBaseNameSchema,
    description: knowledgeDescriptionSchema.optional().default(null),
    embedding_model: chunkConfigFields.embedding_model.default(
      "text-embedding-ada-002",
    ),
    chunk_method: chunkConfigFields.chunk_method.default("fixed"),
    chunk_size: chunkConfigFields.chunk_size.default(500),
    chunk_overlap: chunkConfigFields.chunk_overlap.default(50),
    retrieval_strategy:
      chunkConfigFields.retrieval_strategy.default("hybrid"),
    top_k: chunkConfigFields.top_k.default(5),
    similarity_threshold:
      chunkConfigFields.similarity_threshold.default(0.7),
  })
  .strict()
  .superRefine(validateChunkOverlap)

export const knowledgeBaseUpdateSchema = z
  .object({
    name: knowledgeBaseNameSchema.optional(),
    description: knowledgeDescriptionSchema.optional(),
    embedding_model: embeddingModelSchema.optional(),
  })
  .strict()
  .refine(
    (value) => Object.values(value).some((item) => item !== undefined),
    "至少提供一个要更新的字段",
  )

export const knowledgeBaseConfigSchema = z
  .object({
    embedding_model: chunkConfigFields.embedding_model.optional(),
    chunk_method: chunkConfigFields.chunk_method.optional(),
    chunk_size: chunkConfigFields.chunk_size.optional(),
    chunk_overlap: chunkConfigFields.chunk_overlap.optional(),
    retrieval_strategy:
      chunkConfigFields.retrieval_strategy.optional(),
    top_k: chunkConfigFields.top_k.optional(),
    similarity_threshold:
      chunkConfigFields.similarity_threshold.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (!Object.values(value).some((item) => item !== undefined)) {
      context.addIssue({
        code: "custom",
        message: "至少提供一个要更新的配置字段",
      })
    }
    validateChunkOverlap(value, context)
  })

export const knowledgeBaseSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  description: z.string().nullable(),
  status: knowledgeBaseStatusSchema,
  document_count: z.number().int().nonnegative(),
  segment_count: z.number().int().nonnegative(),
  embedding_model: z.string(),
  chunk_method: chunkMethodSchema,
  chunk_size: z.number().int().positive(),
  chunk_overlap: z.number().int().nonnegative(),
  retrieval_strategy: retrievalStrategySchema,
  top_k: z.number().int().positive(),
  similarity_threshold: z.number().min(0).max(1),
  created_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const knowledgeDocumentSchema = z.object({
  id: z.number().int().positive(),
  knowledge_base_id: z.number().int().positive(),
  file_name: z.string(),
  file_type: z.string(),
  file_size: z.string().nullable(),
  minio_path: z.string().nullable(),
  status: documentStatusSchema,
  segment_count: z.number().int().nonnegative(),
  word_count: z.number().int().nonnegative(),
  error_message: z.string().nullable(),
  uploaded_by: z.string().nullable(),
  created_at: z.string(),
  uploaded_at: z.string().nullable(),
  processed_at: z.string().nullable(),
  updated_at: z.string(),
})

export const knowledgeSegmentSchema = z.object({
  id: z.number().int().positive(),
  knowledge_base_id: z.number().int().positive(),
  document_id: z.number().int().positive(),
  position: z.number().int().nonnegative(),
  content: z.string(),
  word_count: z.number().int().nonnegative(),
  token_count: z.number().int().nonnegative(),
  keywords: z.array(z.string()).nullable(),
  hit_count: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
})

const segmentKeywordSchema = z
  .string()
  .trim()
  .min(1, "关键词不能为空")
  .max(100, "单个关键词不能超过 100 个字符")

export const segmentUpdateSchema = z
  .object({
    content: z
      .string()
      .max(16_000, "分段内容不能超过 16000 个字符")
      .refine((value) => Boolean(value.trim()), "分段内容不能为空")
      .optional(),
    keywords: z
      .array(segmentKeywordSchema)
      .max(100, "关键词不能超过 100 个")
      .nullable()
      .optional()
      .transform((values) =>
        values === undefined || values === null
          ? values
          : Array.from(new Set(values)),
      ),
  })
  .strict()
  .refine(
    (value) => Object.values(value).some((item) => item !== undefined),
    "至少提供一个要更新的字段",
  )

export const retrievalTestInputSchema = z
  .object({
    query: z
      .string()
      .trim()
      .min(1, "请输入检索内容")
      .max(10_000, "检索内容不能超过 10000 个字符"),
    strategy: retrievalStrategySchema.default("hybrid"),
    top_k: z.number().int().min(1).max(20).default(5),
    similarity_threshold: z.number().min(0).max(1).default(0.7),
  })
  .strict()

export const retrievalTestResultSchema = z.object({
  segment_id: z.number().int().positive(),
  document_id: z.number().int().positive(),
  document_name: z.string(),
  content: z.string(),
  score: z.number().min(0).max(1),
  position: z.number().int().nonnegative(),
})

export const agentTypeSchema = z.enum([
  "conversation",
  "tool",
  "analysis",
  "creative",
  "workflow",
])
export const agentStatusSchema = z.enum([
  "draft",
  "inactive",
  "active",
  "error",
])

export const agentModelConfigSchema = z
  .object({
    modelId: z.string().min(1).max(100).nullable(),
    temperature: z.number().min(0).max(2),
    maxTokens: z.number().int().min(1).max(1_000_000),
    topP: z.number().positive().max(1),
  })
  .strict()

export const agentPromptConfigSchema = z
  .object({
    systemPrompt: z.string().max(100_000),
    promptTemplateId: z.number().int().positive().nullable(),
  })
  .strict()

export const agentRagConfigSchema = z
  .object({
    enabled: z.boolean(),
    knowledgeBaseIds: z.array(z.number().int().positive()).max(50),
    retrievalStrategy: retrievalStrategySchema,
    topK: z.number().int().min(1).max(100),
    similarityThreshold: z.number().min(0).max(1),
  })
  .strict()

export const agentToolsConfigSchema = z
  .object({
    enabled: z.boolean(),
    toolIds: z.array(z.number().int().positive()).max(100),
  })
  .strict()

export const agentAdvancedConfigSchema = z
  .object({
    welcomeMessage: z.string().max(2_000),
    suggestedQuestions: z.array(z.string().min(1).max(200)).max(20),
    maxTurns: z.number().int().min(1).max(1_000),
    timeout: z.number().positive().max(300),
  })
  .strict()

export const agentConfigSchema = z
  .object({
    model: agentModelConfigSchema,
    prompt: agentPromptConfigSchema,
    rag: agentRagConfigSchema,
    tools: agentToolsConfigSchema,
    advanced: agentAdvancedConfigSchema,
  })
  .strict()

export const agentSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  description: z.string().nullable(),
  type: agentTypeSchema,
  status: agentStatusSchema,
  model_id: z.number().int().positive().nullable(),
  prompt_id: z.number().int().positive().nullable(),
  config: agentConfigSchema.nullable(),
  success_rate: z.number().min(0).max(100),
  call_count_7d: z.number().int().nonnegative(),
  version: z.string().nullable(),
  current_version_id: z.number().int().positive().nullable(),
  created_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const agentVersionSchema = z.object({
  id: z.number().int().positive(),
  agent_id: z.number().int().positive(),
  version: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: agentTypeSchema,
  model_id: z.number().int().positive().nullable(),
  prompt_id: z.number().int().positive().nullable(),
  config: agentConfigSchema,
  changelog: z.string().nullable(),
  is_current: z.boolean(),
  published_by: z.string().nullable(),
  published_at: z.string().nullable(),
})

export const agentCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: z.string().max(5_000).nullable(),
    type: agentTypeSchema,
    model_id: z.number().int().positive().nullable(),
    config: agentConfigSchema,
  })
  .strict()

export const agentUpdateSchema = agentCreateSchema.partial().strict()

export const agentPublishSchema = z
  .object({
    changelog: z.string().max(500),
  })
  .strict()

export const agentRollbackSchema = z
  .object({
    version_id: z.number().int().positive(),
  })
  .strict()

const agentVariableValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
])

export const agentInvokeSchema = z
  .object({
    input: z.string().min(1).max(100_000),
    history: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().min(1).max(100_000),
          })
          .strict(),
      )
      .max(200),
    variables: z.record(z.string(), agentVariableValueSchema),
  })
  .strict()

export const agentInvokeResultSchema = z.object({
  content: z.string().nullable(),
  tool_calls: z.array(z.record(z.string(), z.unknown())),
  usage: z.record(z.string(), z.unknown()).nullable(),
  model_id: z.string(),
  latency_ms: z.number().int().nonnegative(),
})

const agentJsonVariablesSchema = z.string().refine((value) => {
  try {
    const parsed: unknown = JSON.parse(value || "{}")
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      Object.values(parsed).every(
        (item) =>
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean",
      )
    )
  } catch {
    return false
  }
}, "请输入只包含字符串、数字或布尔值的 JSON 对象")

export const agentFormSchema = z
  .object({
    name: z.string().trim().min(1, "请输入 Agent 名称").max(200),
    description: z.string().max(5_000, "描述不能超过 5000 个字符"),
    type: agentTypeSchema,
    model_id: z.number().int().nonnegative(),
    temperature: z.number().min(0).max(2),
    max_tokens: z.number().int().min(1).max(1_000_000),
    top_p: z.number().positive().max(1),
    prompt_template_id: z.number().int().nonnegative(),
    system_prompt: z.string().max(100_000),
    rag_enabled: z.boolean(),
    knowledge_base_ids: z.array(z.number().int().positive()).max(50),
    retrieval_strategy: retrievalStrategySchema,
    top_k: z.number().int().min(1).max(100),
    similarity_threshold: z.number().min(0).max(1),
    tools_enabled: z.boolean(),
    tool_ids: z.array(z.number().int().positive()).max(100),
    welcome_message: z.string().max(2_000),
    suggested_questions: z.string(),
    max_turns: z.number().int().min(1).max(1_000),
    timeout: z.number().positive().max(300),
  })
  .superRefine((value, context) => {
    if (value.rag_enabled && value.knowledge_base_ids.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["knowledge_base_ids"],
        message: "启用 RAG 时至少选择一个知识库",
      })
    }
    if (value.tools_enabled && value.tool_ids.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["tool_ids"],
        message: "启用工具时至少选择一个工具",
      })
    }
    const questions = value.suggested_questions
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
    if (questions.length > 20 || questions.some((item) => item.length > 200)) {
      context.addIssue({
        code: "custom",
        path: ["suggested_questions"],
        message: "最多 20 条推荐问题，每条不超过 200 个字符",
      })
    }
  })

export const agentInvokeFormSchema = z.object({
  input: z.string().trim().min(1, "请输入测试消息").max(100_000),
  variables_json: agentJsonVariablesSchema,
})

export const assignRolesSchema = z.object({
  role_ids: z.array(z.number().int().positive()),
})

export const assignPermissionsSchema = z.object({
  permission_ids: z.array(z.number().int().positive()),
})

export type Permission = z.infer<typeof permissionSchema>
export type Role = z.infer<typeof roleSchema>
export type User = z.infer<typeof userSchema>
export type UserWithRoles = z.infer<typeof userWithRolesSchema>
export type AccessCodes = z.infer<typeof accessCodesSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UserCreateInput = z.infer<typeof userCreateSchema>
export type RoleCreateInput = z.input<typeof roleCreateSchema>
export type RoleUpdateInput = z.input<typeof roleUpdateSchema>
export type PermissionCreateInput = z.input<typeof permissionCreateSchema>
export type PermissionUpdateInput = z.input<typeof permissionUpdateSchema>
export type ProviderType = z.infer<typeof providerTypeSchema>
export type ProviderStatus = z.infer<typeof providerStatusSchema>
export type Provider = z.infer<typeof providerSchema>
export type ProviderCreateInput = z.input<typeof providerCreateSchema>
export type ProviderUpdateInput = z.input<typeof providerUpdateSchema>
export type ProviderFormInput = z.input<typeof providerFormSchema>
export type ProviderConnectionTestResult = z.infer<
  typeof providerConnectionTestResultSchema
>
export type ModelStatus = z.infer<typeof modelStatusSchema>
export type Model = z.infer<typeof modelSchema>
export type ModelCreateInput = z.input<typeof modelCreateSchema>
export type ModelUpdateInput = z.input<typeof modelUpdateSchema>
export type ModelFormInput = z.input<typeof modelFormSchema>
export type PromptStatus = z.infer<typeof promptStatusSchema>
export type PromptVariableType = z.infer<typeof promptVariableTypeSchema>
export type PromptVariable = z.infer<typeof promptVariableSchema>
export type Prompt = z.infer<typeof promptSchema>
export type PromptVersion = z.infer<typeof promptVersionSchema>
export type PromptCreateInput = z.input<typeof promptCreateSchema>
export type PromptUpdateInput = z.input<typeof promptUpdateSchema>
export type PromptPublishInput = z.input<typeof promptPublishSchema>
export type PromptRollbackInput = z.input<typeof promptRollbackSchema>
export type PromptFormInput = z.input<typeof promptFormSchema>
export type ToolType = z.infer<typeof toolTypeSchema>
export type ToolStatus = z.infer<typeof toolStatusSchema>
export type ToolFunctionDefinition = z.infer<
  typeof toolFunctionDefinitionSchema
>
export type Tool = z.infer<typeof toolSchema>
export type ToolCreateInput = z.input<typeof toolCreateSchema>
export type ToolUpdateInput = z.input<typeof toolUpdateSchema>
export type ToolTestInput = z.input<typeof toolTestInputSchema>
export type ToolTestResult = z.infer<typeof toolTestResultSchema>
export type ToolFormInput = z.input<typeof toolFormSchema>
export type KnowledgeBaseStatus = z.infer<
  typeof knowledgeBaseStatusSchema
>
export type DocumentStatus = z.infer<typeof documentStatusSchema>
export type ChunkMethod = z.infer<typeof chunkMethodSchema>
export type RetrievalStrategy = z.infer<typeof retrievalStrategySchema>
export type KnowledgeBase = z.infer<typeof knowledgeBaseSchema>
export type KnowledgeBaseCreateInput = z.input<
  typeof knowledgeBaseCreateSchema
>
export type KnowledgeBaseUpdateInput = z.input<
  typeof knowledgeBaseUpdateSchema
>
export type KnowledgeBaseConfigInput = z.input<
  typeof knowledgeBaseConfigSchema
>
export type KnowledgeDocument = z.infer<typeof knowledgeDocumentSchema>
export type KnowledgeSegment = z.infer<typeof knowledgeSegmentSchema>
export type KnowledgeSegmentUpdateInput = z.input<
  typeof segmentUpdateSchema
>
export type RetrievalTestInput = z.input<typeof retrievalTestInputSchema>
export type RetrievalTestResult = z.infer<
  typeof retrievalTestResultSchema
>
export type AgentType = z.infer<typeof agentTypeSchema>
export type AgentStatus = z.infer<typeof agentStatusSchema>
export type AgentConfig = z.infer<typeof agentConfigSchema>
export type Agent = z.infer<typeof agentSchema>
export type AgentVersion = z.infer<typeof agentVersionSchema>
export type AgentCreateInput = z.input<typeof agentCreateSchema>
export type AgentUpdateInput = z.input<typeof agentUpdateSchema>
export type AgentPublishInput = z.input<typeof agentPublishSchema>
export type AgentRollbackInput = z.input<typeof agentRollbackSchema>
export type AgentInvokeInput = z.input<typeof agentInvokeSchema>
export type AgentInvokeResult = z.infer<typeof agentInvokeResultSchema>
export type AgentFormInput = z.input<typeof agentFormSchema>
export type AgentInvokeFormInput = z.input<typeof agentInvokeFormSchema>
