import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
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
