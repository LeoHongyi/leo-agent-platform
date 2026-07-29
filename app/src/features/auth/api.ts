"use client"

import { apiMutation, apiRequest } from "@/lib/api/client"
import { endpoints } from "@/lib/api/endpoints"
import {
  accessCodesSchema,
  captchaSchema,
  userSchema,
  type LoginInput,
} from "@/lib/api/schemas"

export const authApi = {
  captcha: () => apiRequest(endpoints.captcha, captchaSchema),
  login: (input: LoginInput) =>
    apiMutation(endpoints.login, { method: "POST", body: input }),
  logout: () => apiMutation(endpoints.logout, { method: "POST" }),
  me: () => apiRequest(endpoints.me, userSchema),
  access: () => apiRequest(endpoints.access, accessCodesSchema),
}
