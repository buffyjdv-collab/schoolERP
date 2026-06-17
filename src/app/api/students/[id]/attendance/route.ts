import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const records = await db.attendance.findMany({ where: { studentId: id }, include: { student: true }, orderBy: { date: 'desc' }, take: 60 })
  return NextResponse.json(records.map(r => ({ id: r.id, studentId: r.studentId, studentName: `${r.student.firstName} ${r.student.lastName}`, admissionNo: r.student.admissionNo, date: r.date.toISOString(), status: r.status, method: r.method })))
}
