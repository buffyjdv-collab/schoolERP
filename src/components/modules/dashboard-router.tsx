'use client'

import { useStore } from '@/lib/store'
import { AdminDashboard } from './dashboard'
import { StudentDashboard, ParentDashboard, TeacherDashboard } from './dashboard-scoped'

export function DashboardModule() {
  const role = useStore((s) => s.user?.role)
  if (role === 'student') return <StudentDashboard />
  if (role === 'parent') return <ParentDashboard />
  if (role === 'teacher') return <TeacherDashboard />
  return <AdminDashboard />
}
