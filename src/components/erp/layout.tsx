'use client'

import { useStore } from '@/lib/store'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { AiAssistantDrawer } from './ai-drawer'
import { DashboardModule } from '@/components/modules/dashboard'
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
import { cn } from '@/lib/utils'

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
  const { activeModule } = useStore()
  const Active = modules[activeModule] || DashboardModule

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className={cn('flex-1 overflow-y-auto scroll-thin', activeModule === 'ai-assistant' ? '' : 'p-4 lg:p-6')}>
          <div className={activeModule === 'ai-assistant' ? 'h-full' : 'max-w-[1600px] mx-auto'}>
            <Active />
          </div>
        </main>
      </div>
      <AiAssistantDrawer />
    </div>
  )
}
