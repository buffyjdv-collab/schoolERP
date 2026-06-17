import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const classId = searchParams.get('classId')!
  const dateStr = searchParams.get('date')!
  const d = new Date(dateStr); d.setHours(0,0,0,0)
  const students = await db.student.findMany({ where: { classId }, include: { section: true }, orderBy: { rollNo: 'asc' } })
  const records = await db.attendance.findMany({ where: { date: d, studentId: { in: students.map(s => s.id) } } })
  const map = new Map(records.map(r => [r.studentId, r.status]))
  return NextResponse.json(students.map(s => ({
    student: {
      id: s.id, admissionNo: s.admissionNo, firstName: s.firstName, lastName: s.lastName,
      fullName: `${s.firstName} ${s.lastName}`, rollNo: s.rollNo, sectionName: s.section?.name || '-',
    },
    status: map.get(s.id) || 'NotMarked',
  })))
}
