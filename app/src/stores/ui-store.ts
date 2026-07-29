import { createStore } from "zustand/vanilla"

export type UiState = {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

export function createUiStore() {
  return createStore<UiState>()((set) => ({
    sidebarCollapsed: false,
    toggleSidebar: () =>
      set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  }))
}

export type UiStore = ReturnType<typeof createUiStore>
