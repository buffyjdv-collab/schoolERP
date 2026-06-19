import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { canUser } from "@/lib/rbac"

async function canAccessStudent(studentId: string) {
  const user = await getCurrentUser()
  if (!user) return { ok: false as const, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!canUser(user, 'exams', 'view')) return { ok: false as const, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
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
  const marks = await db.examMark.findMany({ where: { studentId: id }, include: { student: true, exam: true }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(marks.map(m => ({
    id: m.id, examId: m.examId, studentId: m.studentId, studentName: `${m.student.firstName} ${m.student.lastName}`,
    admissionNo: m.student.admissionNo, subject: m.subject, maxMarks: m.maxMarks, obtained: m.obtained, grade: m.grade,
    remarks: m.remarks, examName: m.exam.name,
  })))
}
