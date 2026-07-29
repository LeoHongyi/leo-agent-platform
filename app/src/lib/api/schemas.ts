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
