"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Provider } from "@/lib/api/schemas"

const ALL_PROVIDERS = "all"

export function ModelProviderFilter({
  providers,
  providerId,
}: {
  providers: Provider[]
  providerId?: number
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  function changeProvider(value: string | null) {
    if (!value) return
    const next = new URLSearchParams(searchParams.toString())
    next.set("page", "1")
    if (value === ALL_PROVIDERS) next.delete("provider_id")
    else next.set("provider_id", value)
    router.replace(`${pathname}?${next.toString()}`)
  }

  return (
    <Select
      value={providerId ? String(providerId) : ALL_PROVIDERS}
      onValueChange={changeProvider}
    >
      <SelectTrigger
        className="h-9 w-full sm:w-52"
        aria-label="按供应商筛选模型"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_PROVIDERS}>全部供应商</SelectItem>
        {providers.map((provider) => (
          <SelectItem key={provider.id} value={String(provider.id)}>
            {provider.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
