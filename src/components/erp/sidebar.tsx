'use client'

import { useStore, useAccessibleModules } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, UserPlus, GraduationCap, CalendarCheck,
  Wallet, ClipboardList, CalendarDays, Bus, BookOpen, UsersRound,
  MessageSquare, Package, Sparkles, ChevronLeft, School, ShieldCheck,
} from 'lucide-react'
import type { ModuleId } from '@/lib/types'
import { Badge } from '@/components/ui/badge'

interface NavItem {
  id: ModuleId
  label: string
  icon: any
  group: string
  badge?: string
}

const nav: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard / MIS', icon: LayoutDashboard, group: 'Overview' },
  { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles, group: 'Overview', badge: 'AI' },

  { id: 'admissions', label: 'Admissions', icon: UserPlus, group: 'Academic Operations' },
  { id: 'students', label: 'Students', icon: Users, group: 'Academic Operations' },
  { id: 'academics', label: 'Academics', icon: GraduationCap, group: 'Academic Operations' },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck, group: 'Academic Operations' },
  { id: 'exams', label: 'Examinations', icon: ClipboardList, group: 'Academic Operations' },
  { id: 'timetable', label: 'Timetable', icon: CalendarDays, group: 'Academic Operations' },

  { id: 'fees', label: 'Fees & Accounts', icon: Wallet, group: 'Finance & HR' },
  { id: 'hr', label: 'HR & Payroll', icon: UsersRound, group: 'Finance & HR' },

  { id: 'transport', label: 'Transport & GPS', icon: Bus, group: 'Resources' },
  { id: 'library', label: 'Library', icon: BookOpen, group: 'Resources' },
  { id: 'assets', label: 'Assets & Inventory', icon: Package, group: 'Resources' },

  { id: 'communication', label: 'Communication', icon: MessageSquare, group: 'Engagement' },
  { id: 'user-management', label: 'User Management', icon: ShieldCheck, group: 'System', badge: 'SA' },
]

const groups = ['Overview', 'Academic Operations', 'Finance & HR', 'Resources', 'Engagement', 'System']

export function Sidebar() {
  const { activeModule, setModule, sidebarCollapsed, toggleSidebar } = useStore()
  const accessible = useAccessibleModules()

  return (
    <aside
      className={cn(
        'flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0',
        sidebarCollapsed ? 'w-[68px]' : 'w-[260px]'
      )}
    >
      {/* Brand */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-sidebar-border shrink-0">
        <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-emerald-600 grid place-items-center shrink-0 shadow-sm shadow-primary/30">
          <School className="size-5 text-primary-foreground" />
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <div className="font-bold text-[15px] leading-tight text-sidebar-foreground truncate">Vidyamatrix</div>
            <div className="text-[10px] text-muted-foreground tracking-wider uppercase">School ERP</div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="ml-auto p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground transition-colors"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft className={cn('size-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scroll-thin py-3 px-2 space-y-4">
        {groups.map((group) => {
          const groupItems = nav.filter((n) => n.group === group && accessible.includes(n.id))
          if (!groupItems.length) return null
          return (
          <div key={group}>
            {!sidebarCollapsed && (
              <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{group}</div>
            )}
            <div className="space-y-0.5">
              {groupItems.map((item) => {
                const Icon = item.icon
                const active = activeModule === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setModule(item.id)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group relative',
                      active
                        ? 'bg-primary/10 text-primary shadow-sm'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      sidebarCollapsed && 'justify-center'
                    )}
                  >
                    <Icon className={cn('size-[18px] shrink-0 transition-colors', active ? 'text-primary' : 'text-muted-foreground group-hover:text-sidebar-accent-foreground')} />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    {!sidebarCollapsed && item.badge && (
                      <Badge variant="secondary" className="ml-auto text-[9px] px-1.5 py-0 h-4 bg-primary/15 text-primary">{item.badge}</Badge>
                    )}
                    {sidebarCollapsed && item.badge && (
                      <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          )
        })}
      </nav>

      {/* Footer */}
      {!sidebarCollapsed && (
        <div className="p-3 border-t border-sidebar-border shrink-0">
          <div className="rounded-xl bg-gradient-to-br from-primary/10 to-emerald-500/5 p-3 text-xs border border-primary/10">
            <div className="font-semibold text-foreground mb-0.5">Academic Year</div>
            <div className="text-muted-foreground">2026–27 · Active</div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All systems operational
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
