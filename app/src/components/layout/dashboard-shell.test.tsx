import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DashboardShell } from "@/components/layout/dashboard-shell"
import { AppProviders } from "@/providers/app-providers"

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}))

describe("DashboardShell", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("opens the account menu without rendering or hydration errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const user = userEvent.setup()

    render(
      <AppProviders>
        <DashboardShell
          session={{
            user: {
              id: 1,
              username: "admin",
              email: "admin@example.com",
              is_active: true,
            },
            access: {
              permissions: ["*"],
              roles: ["admin"],
            },
          }}
        >
          <p>Dashboard content</p>
        </DashboardShell>
      </AppProviders>,
    )

    expect(
      screen.getByRole("link", { name: "模型供应商" }),
    ).toHaveAttribute("href", "/providers")
    expect(
      screen.getByRole("link", { name: "模型管理" }),
    ).toHaveAttribute("href", "/models")
    expect(
      screen.getByRole("link", { name: "Prompt 管理" }),
    ).toHaveAttribute("href", "/prompts")
    expect(
      screen.getByRole("link", { name: "工具管理" }),
    ).toHaveAttribute("href", "/tools")
    expect(
      screen.getByRole("link", { name: "知识库管理" }),
    ).toHaveAttribute("href", "/knowledge-bases")

    await user.click(screen.getByRole("button", { name: /admin/i }))

    expect(await screen.findByText("admin@example.com")).toBeVisible()
    const errors = consoleError.mock.calls.flat().join(" ")
    expect(errors).not.toContain("MenuGroupContext is missing")
    expect(errors).not.toContain("Encountered a script tag")
    expect(errors).not.toContain("Hydration failed")
  })
})
