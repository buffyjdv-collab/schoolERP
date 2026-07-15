import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('exams', 'edit')
  if (!guard.ok) return guard.res
  const body = await req.json()
  const exam = await db.exam.update({ where: { id }, data: {
    name: body.name, examType: body.examType,
    startDate: body.startDate ? new Date(body.startDate) : undefined,
    endDate: body.endDate ? new Date(body.endDate) : undefined,
    status: body.status,
    subject: body.subject !== undefined ? body.subject : undefined,
    classId: body.classId !== undefined ? body.classId : undefined,
    paperUrl: body.paperUrl !== undefined ? body.paperUrl : undefined,
    maxMarks: typeof body.maxMarks === 'number' && body.maxMarks > 0 ? body.maxMarks : undefined,
  }})
  // Link class if provided and not already linked
  if (body.classId) {
    await db.examClass.upsert({
      where: { examId_classId: { examId: id, classId: body.classId } },
      create: { examId: id, classId: body.classId },
      update: {},
    }).catch(() => {})
  }
  return NextResponse.json(exam)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('exams', 'delete')
  if (!guard.ok) return guard.res
  await db.exam.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
