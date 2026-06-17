import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const examId = searchParams.get('examId')!
  const classId = searchParams.get('classId') || undefined

  const marks = await db.examMark.findMany({
    where: { examId, ...(classId ? { student: { classId } } : {}) },
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
