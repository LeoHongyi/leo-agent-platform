"use client"

import {
  Bot,
  BookOpenText,
  CloudCog,
  Cpu,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  ShieldCheck,
  Sun,
  Users,
  Wrench,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useState, type ReactNode } from "react"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { authApi } from "@/features/auth/api"
import type { AuthSession } from "@/lib/api/server"
import { cn } from "@/lib/utils"
import { useUiStore } from "@/providers/ui-store-provider"

const navigation = [
  { href: "/dashboard", label: "工作台", icon: LayoutDashboard },
  { href: "/users", label: "用户管理", icon: Users },
  { href: "/roles", label: "角色管理", icon: ShieldCheck },
  { href: "/permissions", label: "权限管理", icon: KeyRound },
  { href: "/providers", label: "模型供应商", icon: CloudCog },
  { href: "/models", label: "模型管理", icon: Cpu },
  { href: "/prompts", label: "Prompt 管理", icon: ScrollText },
  { href: "/tools", label: "工具管理", icon: Wrench },
  { href: "/knowledge-bases", label: "知识库管理", icon: BookOpenText },
  { href: "/agents", label: "Agent 管理", icon: Bot },
]

export function DashboardShell({
  children,
  session,
}: {
  children: ReactNode
  session: AuthSession
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const collapsed = useUiStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)

  async function logout() {
    setLoggingOut(true)
    try {
      await authApi.logout()
      router.replace("/login")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "退出失败")
    } finally {
      setLoggingOut(false)
    }
  }

  const nav = (
    <nav className="grid gap-1 px-2">
      {navigation.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`))
        const link = (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "lg:justify-center lg:px-0",
            )}
          >
            <item.icon className="size-4.5 shrink-0" />
            <span className={cn(collapsed && "lg:sr-only")}>{item.label}</span>
          </Link>
        )

        return collapsed ? (
          <Tooltip key={item.href}>
            <TooltipTrigger render={link} />
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        ) : (
          link
        )
      })}
    </nav>
  )

  return (
    <div className="min-h-dvh bg-muted/20">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r bg-sidebar/95 backdrop-blur transition-[width] duration-200 lg:flex lg:flex-col",
          collapsed ? "w-18" : "w-64",
        )}
      >
        <Brand collapsed={collapsed} />
        <div className="flex-1 py-4">{nav}</div>
        <div className="border-t p-2">
          <Button
            variant="ghost"
            className="w-full justify-center text-muted-foreground"
            onClick={toggleSidebar}
            aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            {!collapsed ? <span>收起侧栏</span> : null}
          </Button>
        </div>
      </aside>

      <div
        className={cn(
          "transition-[padding] duration-200",
          collapsed ? "lg:pl-18" : "lg:pl-64",
        )}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background/85 px-4 backdrop-blur-lg sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="mr-2 lg:hidden"
                  aria-label="打开导航"
                />
              }
            >
              <Menu />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>导航</SheetTitle>
                <SheetDescription>后台主导航</SheetDescription>
              </SheetHeader>
              <Brand />
              <div className="py-4">{nav}</div>
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-muted-foreground">
              你好，{session.user.username}
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            aria-label="切换主题"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          >
            <Sun className="hidden dark:block" />
            <Moon className="dark:hidden" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className="ml-1 h-10 gap-2 px-2" />
              }
            >
              <Avatar size="sm">
                <AvatarFallback>
                  {session.user.username.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-28 truncate text-sm sm:inline">
                {session.user.username}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <span className="block truncate text-foreground">
                    {session.user.username}
                  </span>
                  <span className="block truncate font-normal">
                    {session.user.email}
                  </span>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={loggingOut}
                onClick={logout}
              >
                <LogOut />
                {loggingOut ? "正在退出…" : "退出登录"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex h-16 items-center gap-3 border-b px-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <Bot className="size-5" />
      </span>
      <div className={cn("min-w-0", collapsed && "lg:hidden")}>
        <p className="truncate text-sm font-semibold">Leo Agent</p>
        <p className="truncate text-xs text-muted-foreground">管理控制台</p>
      </div>
    </div>
  )
}
