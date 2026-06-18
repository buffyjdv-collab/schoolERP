import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('academics', 'edit')
  if (!guard.ok) return guard.res
  const body = await req.json()
  const slot = await db.timetableSlot.update({ where: { id }, data: {
    subjectName: body.subjectName, teacherName: body.teacherName, room: body.room,
    startTime: body.startTime, endTime: body.endTime,
  }})
  return NextResponse.json(slot)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('academics', 'delete')
  if (!guard.ok) return guard.res
  await db.timetableSlot.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
