import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { canUser } from "@/lib/rbac"

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canUser(user, 'attendance', 'mark')) return NextResponse.json({ error: 'Forbidden — your role cannot mark attendance' }, { status: 403 })

  const { studentId, date, status, method } = await req.json()

  // Teachers can only mark attendance for students in their classes
  if (user.role === 'teacher') {
    const student = await db.student.findUnique({ where: { id: studentId }, select: { classId: true } })
    if (!student || !user.teacherClassIds.includes(student.classId || '')) {
      return NextResponse.json({ error: 'Forbidden — student not in your class' }, { status: 403 })
    }
  }

  const d = new Date(date); d.setHours(0,0,0,0)
  const rec = await db.attendance.upsert({
    where: { studentId_date: { studentId, date: d } },
    create: { studentId, date: d, status, method: method || 'Manual' },
    update: { status, method: method || 'Manual' },
  })
  return NextResponse.json(rec)
}
