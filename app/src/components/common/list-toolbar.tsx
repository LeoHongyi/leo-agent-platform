"use client"

import { Search, X } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ListToolbar({
  search,
  placeholder,
  preservedParams,
}: {
  search: string
  placeholder: string
  preservedParams?: Record<string, string>
}) {
  const pathname = usePathname()
  const router = useRouter()

  function submit(formData: FormData) {
    const value = String(formData.get("search") || "").trim()
    const params = new URLSearchParams(preservedParams)
    if (value) params.set("search", value)
    router.replace(`${pathname}?${params.toString()}`)
  }

  function clear() {
    const params = new URLSearchParams(preservedParams)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <form action={submit} className="flex w-full gap-2 sm:max-w-md">
      <div className="relative min-w-0 flex-1">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          key={search}
          name="search"
          defaultValue={search}
          placeholder={placeholder}
          className="h-9 pl-9"
        />
      </div>
      <Button type="submit" variant="secondary" className="h-9">
        搜索
      </Button>
      {search ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9"
          onClick={clear}
          aria-label="清除搜索"
        >
          <X />
        </Button>
      ) : null}
    </form>
  )
}
