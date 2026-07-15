import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function GET() {
  const guard = await requirePerm('exams', 'view')
  if (!guard.ok) return guard.res
  const list = await db.exam.findMany({
    include: {
      _count: { select: { marks: true } },
      classes: { include: { class: { select: { name: true } } } },
    },
    orderBy: { startDate: 'desc' },
  })
  return NextResponse.json(list.map(e => ({
    id: e.id, name: e.name, academicYearId: e.academicYearId, examType: e.examType,
    startDate: e.startDate.toISOString(), endDate: e.endDate.toISOString(),
    status: e.status, marksCount: e._count.marks,
    subject: e.subject, classId: e.classId, paperUrl: e.paperUrl, maxMarks: e.maxMarks,
    createdById: e.createdById,
    classes: e.classes.map(ec => ({ id: ec.class.id, name: ec.class.name })),
  })))
}

export async function POST(req: any) {
  const guard = await requirePerm('exams', 'create')
  if (!guard.ok) return guard.res
  const { name, examType, startDate, endDate, academicYearId, subject, classId, paperUrl, maxMarks } = await req.json()
  const exam = await db.exam.create({ data: {
    name, examType, startDate: new Date(startDate), endDate: new Date(endDate),
    academicYearId: academicYearId || (await db.academicYear.findFirst({ where: { isActive: true } }))?.id,
    status: 'Scheduled',
    subject: subject || null,
    classId: classId || null,
    paperUrl: paperUrl || null,
    maxMarks: typeof maxMarks === 'number' && maxMarks > 0 ? maxMarks : 100,
    createdById: guard.user.id,
  }})
  // Link class if provided
  if (classId) {
    await db.examClass.create({ data: { examId: exam.id, classId } }).catch(() => {})
  }
  return NextResponse.json(exam)
}
