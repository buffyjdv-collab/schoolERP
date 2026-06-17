'use client'

import { create } from 'zustand'
import type { Role, ModuleId, Action } from './rbac'
import { can, accessibleModules, actionsFor, isStaff } from './rbac'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  employeeId?: string | null
  studentId?: string | null
  teacherClassIds: string[]
  childrenStudentIds: string[]
}

interface AppState {
  // auth
  user: AuthUser | null
  authLoading: boolean
  setUser: (u: AuthUser | null) => void
  setAuthLoading: (b: boolean) => void
  logout: () => Promise<void>
  // nav
  activeModule: ModuleId
  sidebarCollapsed: boolean
  searchQuery: string
  aiAssistantOpen: boolean
  setModule: (m: ModuleId) => void
  toggleSidebar: () => void
  setSearchQuery: (q: string) => void
  setAiAssistantOpen: (open: boolean) => void
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  authLoading: true,
  setUser: (u) => set({ user: u, authLoading: false }),
  setAuthLoading: (b) => set({ authLoading: b }),
  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    set({ user: null, activeModule: 'dashboard' })
  },

  activeModule: 'dashboard',
  sidebarCollapsed: false,
  searchQuery: '',
  aiAssistantOpen: false,
  setModule: (m) => set({ activeModule: m }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setAiAssistantOpen: (open) => set({ aiAssistantOpen: open }),
}))

// ============ Convenience hooks ============

export function useCan(): (module: ModuleId, action?: Action) => boolean {
  const role = useStore((s) => s.user?.role)
  return (module, action = 'view') => (role ? can(role, module, action) : false)
}

export function useAccessibleModules(): ModuleId[] {
  const role = useStore((s) => s.user?.role)
  return role ? accessibleModules(role) : []
}

export function useActionsFor(module: ModuleId): Action[] {
  const role = useStore((s) => s.user?.role)
  return role ? actionsFor(role, module) : []
}

export function useIsStaff(): boolean {
  const role = useStore((s) => s.user?.role)
  return role ? isStaff(role) : false
}
