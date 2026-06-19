import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { canUser } from "@/lib/rbac"

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canUser(user, 'attendance', 'view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const classId = searchParams.get('classId') || undefined
  const today = new Date(); today.setHours(0,0,0,0)

  // Role scoping for "today" summary
  let scopeStudentWhere: any = {}
  if (user.role === 'student') scopeStudentWhere = { id: user.studentId || '__none__' }
  else if (user.role === 'parent') scopeStudentWhere = { id: { in: user.childrenStudentIds.length ? user.childrenStudentIds : ['__none__'] } }
  else if (user.role === 'teacher') scopeStudentWhere = { classId: { in: user.teacherClassIds.length ? user.teacherClassIds : ['__none__'] } }

  const scopedStudentIds = (await db.student.findMany({ where: scopeStudentWhere, select: { id: true } })).map(s => s.id)

  const records = await db.attendance.findMany({ where: { date: today, studentId: { in: scopedStudentIds } } })
  const present = records.filter(r => r.status === 'Present').length
  const absent = records.filter(r => r.status === 'Absent').length
  const late = records.filter(r => r.status === 'Late').length
  const leave = records.filter(r => r.status === 'Leave').length
  const total = records.length || 1
  const rate = Math.round((present / total) * 100)

  // by class (staff only — students/parents get empty)
  const byClass: { label: string; rate: number }[] = []
  if (user.role === 'super_admin' || user.role === 'admin' || user.role === 'teacher') {
    const classFilter = user.role === 'teacher' ? { id: { in: user.teacherClassIds } } : {}
    const classes = await db.class.findMany({ where: classFilter })
    for (const c of classes) {
      const classRecords = await db.attendance.findMany({ where: { date: today, student: { classId: c.id } }, select: { status: true } })
      const p = classRecords.filter(r => r.status === 'Present').length
      byClass.push({ label: c.name, rate: classRecords.length ? Math.round((p/classRecords.length)*100) : 0 })
    }
  } else if (user.role === 'student' || user.role === 'parent') {
    // show the scoped rate as a single "My" entry
    byClass.push({ label: user.role === 'student' ? 'Me' : 'My Children', rate })
  }

  return NextResponse.json({ rate, present, absent, late, leave, byClass })
}
