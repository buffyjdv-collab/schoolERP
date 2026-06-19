import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { canUser } from "@/lib/rbac"

async function canAccessStudent(studentId: string) {
  const user = await getCurrentUser()
  if (!user) return { ok: false as const, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!canUser(user, 'attendance', 'view')) return { ok: false as const, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  if (user.role === 'super_admin' || user.role === 'admin') return { ok: true as const }
  if (user.role === 'student' && studentId === user.studentId) return { ok: true as const }
  if (user.role === 'parent' && user.childrenStudentIds.includes(studentId)) return { ok: true as const }
  if (user.role === 'teacher') {
    const s = await db.student.findUnique({ where: { id: studentId }, select: { classId: true } })
    if (s && user.teacherClassIds.includes(s.classId || '')) return { ok: true as const }
  }
  return { ok: false as const, res: NextResponse.json({ error: 'Forbidden — not authorized for this student' }, { status: 403 }) }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await canAccessStudent(id)
  if (!guard.ok) return guard.res
  const records = await db.attendance.findMany({ where: { studentId: id }, include: { student: true }, orderBy: { date: 'desc' }, take: 60 })
  return NextResponse.json(records.map(r => ({ id: r.id, studentId: r.studentId, studentName: `${r.student.firstName} ${r.student.lastName}`, admissionNo: r.student.admissionNo, date: r.date.toISOString(), status: r.status, method: r.method })))
}
