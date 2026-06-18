import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const guard = await requirePerm('academics', 'view')
  if (!guard.ok) return guard.res
  const { searchParams } = new URL(req.url)
  const classId = searchParams.get('classId')!
  const sectionId = searchParams.get('sectionId') || undefined
  const slots = await db.timetableSlot.findMany({
    where: { classId, sectionId: sectionId || undefined },
    include: { class: true, section: true },
    orderBy: [{ day: 'asc' }, { period: 'asc' }],
  })
  return NextResponse.json(slots.map(s => ({
    id: s.id, classId: s.classId, sectionId: s.sectionId, className: s.class.name, sectionName: s.section?.name || '-',
    day: s.day, period: s.period, subjectName: s.subjectName, teacherName: s.teacherName, room: s.room,
    startTime: s.startTime, endTime: s.endTime,
  })))
}

export async function POST(req: NextRequest) {
  const guard = await requirePerm('academics', 'create')
  if (!guard.ok) return guard.res
  const body = await req.json()
  const slot = await db.timetableSlot.create({ data: {
    classId: body.classId, sectionId: body.sectionId || null, day: body.day, period: body.period,
    subjectName: body.subjectName, teacherName: body.teacherName, room: body.room || null,
    startTime: body.startTime, endTime: body.endTime,
  }})
  return NextResponse.json(slot)
}
