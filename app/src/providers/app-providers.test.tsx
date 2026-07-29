import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AppProviders } from "@/providers/app-providers"

describe("AppProviders", () => {
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

  it("keeps the theme bootstrap script inert during client renders", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const { container } = render(
      <AppProviders>
        <button type="button">打开用户菜单</button>
      </AppProviders>,
    )

    const themeScript = container.querySelector("script")

    expect(themeScript).toHaveAttribute("type", "text/plain")
    expect(
      consoleError.mock.calls
        .flat()
        .join(" "),
    ).not.toContain("Encountered a script tag while rendering React component")
  })
})
