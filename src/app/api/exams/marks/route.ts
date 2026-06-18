import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(user.role, 'exams', 'view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const examId = searchParams.get('examId')!
  const classId = searchParams.get('classId') || undefined

  // Role scoping
  let scopeWhere: any = {}
  if (user.role === 'student') {
    scopeWhere = { studentId: user.studentId || '__none__' }
  } else if (user.role === 'parent') {
    scopeWhere = { studentId: { in: user.childrenStudentIds.length ? user.childrenStudentIds : ['__none__'] } }
  } else if (user.role === 'teacher') {
    scopeWhere = { student: { classId: { in: user.teacherClassIds.length ? user.teacherClassIds : ['__none__'] } } }
  }

  const marks = await db.examMark.findMany({
    where: { examId, AND: [scopeWhere, classId ? { student: { classId } } : {}] },
    include: { student: { include: { class: true } }, exam: true },
    orderBy: { student: { admissionNo: 'asc' } },
  })
  return NextResponse.json(marks.map(m => ({
    id: m.id, examId: m.examId, studentId: m.studentId,
    studentName: `${m.student.firstName} ${m.student.lastName}`,
    admissionNo: m.student.admissionNo, className: m.student.class?.name || '-',
    subject: m.subject, maxMarks: m.maxMarks, obtained: m.obtained, grade: m.grade, remarks: m.remarks,
  })))
}
