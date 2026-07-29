import { isServer, QueryClient } from "@tanstack/react-query"

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (
            typeof error === "object" &&
            error !== null &&
            "status" in error &&
            typeof error.status === "number" &&
            error.status < 500
          ) {
            return false
          }
          return failureCount < 2
        },
      },
      mutations: {
        retry: false,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

export function getQueryClient() {
  if (isServer) return makeQueryClient()

  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}
