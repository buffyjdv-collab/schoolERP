import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function GET() {
  const guard = await requirePerm('exams', 'view')
  if (!guard.ok) return guard.res
  const list = await db.exam.findMany({ include: { _count: { select: { marks: true } } }, orderBy: { startDate: 'desc' } })
  return NextResponse.json(list.map(e => ({ id: e.id, name: e.name, academicYearId: e.academicYearId, examType: e.examType, startDate: e.startDate.toISOString(), endDate: e.endDate.toISOString(), status: e.status, marksCount: e._count.marks })))
}

export async function POST(req: any) {
  const guard = await requirePerm('exams', 'create')
  if (!guard.ok) return guard.res
  const { name, examType, startDate, endDate, academicYearId } = await req.json()
  const exam = await db.exam.create({ data: {
    name, examType, startDate: new Date(startDate), endDate: new Date(endDate),
    academicYearId: academicYearId || (await db.academicYear.findFirst({ where: { isActive: true } }))?.id,
    status: 'Scheduled',
  }})
  return NextResponse.json(exam)
}
