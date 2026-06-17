import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const marks = await db.examMark.findMany({ where: { studentId: id }, include: { student: true, exam: true }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(marks.map(m => ({
    id: m.id, examId: m.examId, studentId: m.studentId,
    studentName: `${m.student.firstName} ${m.student.lastName}`, admissionNo: m.student.admissionNo,
    subject: m.subject, maxMarks: m.maxMarks, obtained: m.obtained, grade: m.grade, remarks: m.remarks,
    examName: m.exam.name,
  })))
}
