import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('academics', 'edit')
  if (!guard.ok) return guard.res
  const body = await req.json()
  const s = await db.section.update({ where: { id }, data: {
    name: body.name,
    capacity: body.capacity,
    teacherId: body.teacherId || null,
  }})
  return NextResponse.json(s)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('academics', 'delete')
  if (!guard.ok) return guard.res
  // Check if students are assigned to this section
  const studentCount = await db.student.count({ where: { sectionId: id } })
  if (studentCount > 0) {
    return NextResponse.json({ error: `Cannot delete: ${studentCount} students are assigned to this section. Reassign them first.` }, { status: 400 })
  }
  // Delete timetable slots for this section
  await db.timetableSlot.deleteMany({ where: { sectionId: id } })
  await db.section.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
