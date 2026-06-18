'use client'

import { useStore } from '@/lib/store'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { AiAssistantDrawer } from './ai-drawer'
import { LoginOverlay } from './login-overlay'
import { DashboardModule } from '@/components/modules/dashboard-router'
import { StudentsModule } from '@/components/modules/students'
import { AdmissionsModule } from '@/components/modules/admissions'
import { AcademicsModule } from '@/components/modules/academics'
import { AttendanceModule } from '@/components/modules/attendance'
import { FeesModule } from '@/components/modules/fees'
import { ExamsModule } from '@/components/modules/exams'
import { TimetableModule } from '@/components/modules/timetable'
import { TransportModule } from '@/components/modules/transport'
import { LibraryModule } from '@/components/modules/library'
import { HrModule } from '@/components/modules/hr'
import { CommunicationModule } from '@/components/modules/communication'
import { AssetsModule } from '@/components/modules/assets'
import { AiAssistantModule } from '@/components/modules/ai-assistant'
import { can } from '@/lib/rbac'
import { Loader2, School } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'

const modules: Record<string, React.ComponentType> = {
  dashboard: DashboardModule,
  students: StudentsModule,
  admissions: AdmissionsModule,
  academics: AcademicsModule,
  attendance: AttendanceModule,
  fees: FeesModule,
  exams: ExamsModule,
  timetable: TimetableModule,
  transport: TransportModule,
  library: LibraryModule,
  hr: HrModule,
  communication: CommunicationModule,
  assets: AssetsModule,
  'ai-assistant': AiAssistantModule,
}

export function ErpLayout() {
  const { activeModule, user, authLoading, setModule, setUser, setAuthLoading } = useStore()

  // Check existing session once on mount
  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me').then(r => r.json()).then((data) => {
      if (cancelled) return
      if (data.user) setUser(data.user)
      else setAuthLoading(false)
    }).catch(() => setAuthLoading(false))
    return () => { cancelled = true }
  }, [])

  // Show loading spinner while session is being fetched
  if (authLoading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <div className="size-12 rounded-2xl bg-primary grid place-items-center">
          <School className="size-6 text-primary-foreground" />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading Vidyamatrix ERP…
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginOverlay />
  }

  // Guard: if the user's role cannot view the active module, redirect to dashboard
  const allowed = can(user.role, activeModule as any, 'view')
  const effectiveModule = allowed ? activeModule : 'dashboard'
  const Active = modules[effectiveModule] || DashboardModule

  if (!allowed) {
    setTimeout(() => setModule('dashboard'), 0)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className={cn('flex-1 overflow-y-auto scroll-thin', effectiveModule === 'ai-assistant' ? '' : 'p-4 lg:p-6')}>
          <div className={effectiveModule === 'ai-assistant' ? 'h-full' : 'max-w-[1600px] mx-auto'}>
            <Active />
          </div>
        </main>
      </div>
      <AiAssistantDrawer />
    </div>
  )
}
