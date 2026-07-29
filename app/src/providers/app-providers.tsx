"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { ThemeProvider } from "next-themes"
import type { ReactNode } from "react"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getQueryClient } from "@/lib/query-client"
import { UiStoreProvider } from "@/providers/ui-store-provider"

const themeScriptProps = {
  type: typeof window === "undefined" ? "text/javascript" : "text/plain",
}

export function AppProviders({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      scriptProps={themeScriptProps}
    >
      <QueryClientProvider client={queryClient}>
        <UiStoreProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </UiStoreProvider>
        <Toaster richColors closeButton />
        {process.env.NODE_ENV === "development" ? (
          <ReactQueryDevtools initialIsOpen={false} />
        ) : null}
      </QueryClientProvider>
    </ThemeProvider>
  )
}
