import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function GET() {
  const guard = await requirePerm('academics', 'view')
  if (!guard.ok) return guard.res
  const classes = await db.class.findMany({
    include: { sections: { include: { _count: { select: { students: true } } } }, subjects: true, _count: { select: { students: true } } },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(classes.map(c => ({
    id: c.id, name: c.name,
    sections: c.sections.map(s => ({ id: s.id, name: s.name, capacity: s.capacity, teacherId: s.teacherId, studentCount: s._count.students })),
    subjectCount: c.subjects.length,
    subjects: c.subjects.map(s => ({ id: s.id, name: s.name, code: s.code, teacherName: s.teacherId })),
    studentCount: c._count.students,
  })))
}

export async function POST(req: any) {
  const guard = await requirePerm('academics', 'create')
  if (!guard.ok) return guard.res
  const { name, academicYearId } = await req.json()
  const cls = await db.class.create({ data: { name, academicYearId: academicYearId || (await db.academicYear.findFirst({ where: { isActive: true } }))?.id } })
  return NextResponse.json(cls)
}
