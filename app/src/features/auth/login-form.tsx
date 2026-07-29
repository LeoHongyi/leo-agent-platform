"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { Bot, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authApi } from "@/features/auth/api"
import {
  loginSchema,
  type LoginInput,
} from "@/lib/api/schemas"

const loginFormSchema = loginSchema.omit({ captcha_key: true })
type LoginFormInput = Omit<LoginInput, "captcha_key">

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter()
  const captcha = useQuery({
    queryKey: ["captcha"],
    queryFn: authApi.captcha,
    staleTime: 0,
    retry: false,
  })
  const form = useForm<LoginFormInput>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
      captcha_code: "",
    },
  })

  async function submit(input: LoginFormInput) {
    if (!captcha.data) {
      toast.error("验证码尚未加载完成")
      return
    }

    try {
      await authApi.login({
        ...input,
        captcha_key: captcha.data.key,
      })
      toast.success("登录成功")
      router.replace(nextPath)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "登录失败")
      form.setValue("captcha_code", "")
      await captcha.refetch()
    }
  }

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        aria-hidden
      >
        <div className="absolute top-[-12rem] left-1/2 size-[32rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute right-[-10rem] bottom-[-10rem] size-[28rem] rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden px-8 lg:block">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1.5 text-sm text-muted-foreground shadow-sm backdrop-blur">
            <ShieldCheck className="size-4 text-primary" />
            统一身份与权限管理
          </div>
          <h1 className="max-w-xl text-5xl leading-[1.1] font-semibold tracking-tight">
            让每一次访问
            <span className="block text-primary">清晰、可控、可追踪</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">
            集中管理用户、角色和权限，使用安全的服务端会话连接 Leo Agent
            Platform。
          </p>
        </section>

        <Card className="surface-panel w-full max-w-md justify-self-center py-6 shadow-xl shadow-primary/5">
          <CardHeader className="gap-3 px-6">
            <div className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Bot className="size-6" />
            </div>
            <div>
              <CardTitle className="text-xl">欢迎回来</CardTitle>
              <CardDescription className="mt-1">
                登录后进入管理控制台
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-6">
            <form
              className="grid gap-4"
              onSubmit={form.handleSubmit(submit)}
              noValidate
            >
              <Field
                label="用户名"
                error={form.formState.errors.username?.message}
              >
                <Input
                  autoComplete="username"
                  placeholder="请输入用户名"
                  className="h-10"
                  aria-invalid={Boolean(form.formState.errors.username)}
                  {...form.register("username")}
                />
              </Field>

              <Field
                label="密码"
                error={form.formState.errors.password?.message}
              >
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder="请输入密码"
                  className="h-10"
                  aria-invalid={Boolean(form.formState.errors.password)}
                  {...form.register("password")}
                />
              </Field>

              <Field
                label="验证码"
                error={form.formState.errors.captcha_code?.message}
              >
                <div className="grid grid-cols-[1fr_142px] gap-2">
                  <Input
                    autoComplete="off"
                    inputMode="text"
                    placeholder="验证码"
                    className="h-11 uppercase"
                    aria-invalid={Boolean(
                      form.formState.errors.captcha_code,
                    )}
                    {...form.register("captcha_code")}
                  />
                  <button
                    type="button"
                    onClick={() => captcha.refetch()}
                    className="group relative grid h-11 overflow-hidden rounded-lg border bg-muted transition hover:border-primary/50"
                    aria-label="刷新验证码"
                  >
                    {captcha.data ? (
                      <Image
                        unoptimized
                        src={captcha.data.image}
                        width={162}
                        height={54}
                        alt="图片验证码，点击刷新"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {captcha.isError ? "加载失败" : "加载中…"}
                      </span>
                    )}
                    <span className="absolute inset-0 grid place-items-center bg-background/80 opacity-0 transition-opacity group-hover:opacity-100">
                      <RefreshCw className="size-4" />
                    </span>
                  </button>
                </div>
              </Field>
              <Button
                type="submit"
                size="lg"
                className="mt-2 h-10 w-full"
                disabled={form.formState.isSubmitting || captcha.isPending}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <LoaderCircle className="animate-spin" />
                    正在登录
                  </>
                ) : (
                  "登录"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
