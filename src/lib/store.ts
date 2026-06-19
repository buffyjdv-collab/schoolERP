'use client'

import { create } from 'zustand'
import type { Role, ModuleId, Action, UserOverrides } from './rbac'
import { canUser, accessibleModulesForUser, isStaff } from './rbac'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  employeeId?: string | null
  studentId?: string | null
  teacherClassIds: string[]
  childrenStudentIds: string[]
  overrides?: UserOverrides  // per-user permission overrides (super admin control)
  roleOverrides?: any  // role-level DB overrides (sent from server for client sidebar)
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

// ============ Convenience hooks (use full user with overrides) ============

export function useCan(): (module: ModuleId, action?: Action) => boolean {
  const user = useStore((s) => s.user)
  return (module, action = 'view') => (user ? canUser(user, module, action) : false)
}

export function useAccessibleModules(): ModuleId[] {
  const user = useStore((s) => s.user)
  return user ? accessibleModulesForUser(user) : []
}

export function useIsStaff(): boolean {
  const role = useStore((s) => s.user?.role)
  return role ? isStaff(role) : false
}
