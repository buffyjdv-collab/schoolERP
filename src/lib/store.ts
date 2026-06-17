'use client'

import { create } from 'zustand'
import type { ModuleId } from './types'

interface AppState {
  activeModule: ModuleId
  sidebarCollapsed: boolean
  selectedStudentId: string | null
  selectedClassId: string | null
  searchQuery: string
  aiAssistantOpen: boolean
  setModule: (m: ModuleId) => void
  toggleSidebar: () => void
  setSelectedStudent: (id: string | null) => void
  setSelectedClass: (id: string | null) => void
  setSearchQuery: (q: string) => void
  setAiAssistantOpen: (open: boolean) => void
}

export const useStore = create<AppState>((set) => ({
  activeModule: 'dashboard',
  sidebarCollapsed: false,
  selectedStudentId: null,
  selectedClassId: null,
  searchQuery: '',
  aiAssistantOpen: false,
  setModule: (m) => set({ activeModule: m, selectedStudentId: null }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSelectedStudent: (id) => set({ selectedStudentId: id }),
  setSelectedClass: (id) => set({ selectedClassId: id }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setAiAssistantOpen: (open) => set({ aiAssistantOpen: open }),
}))
