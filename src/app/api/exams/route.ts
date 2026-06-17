import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const list = await db.exam.findMany({ include: { _count: { select: { marks: true } } }, orderBy: { startDate: 'desc' } })
  return NextResponse.json(list.map(e => ({ id: e.id, name: e.name, academicYearId: e.academicYearId, examType: e.examType, startDate: e.startDate.toISOString(), endDate: e.endDate.toISOString(), status: e.status, marksCount: e._count.marks })))
}
