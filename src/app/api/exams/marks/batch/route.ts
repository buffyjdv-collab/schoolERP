import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

// Batch save marks for multiple students in one request.
// Body: { examId, subject, maxMarks, entries: [{ studentId, obtained }] }
// This avoids auto-saving on each cell edit — the teacher clicks "Save All"
// once all students' marks are filled in.
export async function POST(req: NextRequest) {
  const guard = await requirePerm('exams', 'enter')
  if (!guard.ok) return guard.res
  const { examId, subject, maxMarks, entries } = await req.json()

  if (!examId || !subject || !Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: 'examId, subject and entries[] are required' }, { status: 400 })
  }

  const max = typeof maxMarks === 'number' && maxMarks > 0 ? maxMarks : 100

  // Upsert each mark in a transaction
  const result = await db.$transaction(
    entries.map((entry: { studentId: string; obtained: number | null }) => {
      const obtained = entry.obtained
      const grade = obtained == null ? null
        : obtained >= 90 ? 'A+'
        : obtained >= 80 ? 'A'
        : obtained >= 70 ? 'B+'
        : obtained >= 60 ? 'B'
        : obtained >= 50 ? 'C'
        : obtained >= 40 ? 'D'
        : 'F'
      return db.examMark.upsert({
        where: { examId_studentId_subject: { examId, studentId: entry.studentId, subject } },
        create: { examId, studentId: entry.studentId, subject, maxMarks: max, obtained, grade },
        update: { maxMarks: max, obtained, grade },
      })
    })
  )

  return NextResponse.json({ saved: result.length, marks: result })
}
