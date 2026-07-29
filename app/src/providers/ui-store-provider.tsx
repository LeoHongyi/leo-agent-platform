"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { useStore } from "zustand"

import {
  createUiStore,
  type UiState,
  type UiStore,
} from "@/stores/ui-store"

const UiStoreContext = createContext<UiStore | null>(null)

export function UiStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createUiStore)
  return (
    <UiStoreContext.Provider value={store}>
      {children}
    </UiStoreContext.Provider>
  )
}

export function useUiStore<T>(selector: (state: UiState) => T) {
  const store = useContext(UiStoreContext)
  if (!store) {
    throw new Error("useUiStore 必须在 UiStoreProvider 内使用")
  }
  return useStore(store, selector)
}
