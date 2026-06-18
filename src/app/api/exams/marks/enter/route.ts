import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

// Enter/upsert marks for a student in a subject
export async function POST(req: NextRequest) {
  const guard = await requirePerm('exams', 'enter')
  if (!guard.ok) return guard.res
  const { examId, studentId, subject, maxMarks, obtained, grade, remarks } = await req.json()
  const gradeCalc = grade || (obtained >= 90 ? 'A+' : obtained >= 80 ? 'A' : obtained >= 70 ? 'B+' : obtained >= 60 ? 'B' : obtained >= 50 ? 'C' : obtained >= 40 ? 'D' : 'F')
  const mark = await db.examMark.upsert({
    where: { examId_studentId_subject: { examId, studentId, subject } },
    create: { examId, studentId, subject, maxMarks, obtained, grade: gradeCalc, remarks },
    update: { maxMarks, obtained, grade: gradeCalc, remarks },
  })
  return NextResponse.json(mark)
}
