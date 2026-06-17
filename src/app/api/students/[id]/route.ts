import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = await db.student.findUnique({ where: { id }, include: { class: true, section: true } })
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // attendance last 30
  const today = new Date(); today.setHours(0,0,0,0)
  const thirtyAgo = new Date(today.getTime() - 30*86400000)
  const att = await db.attendance.findMany({ where: { studentId: id, date: { gte: thirtyAgo } }, orderBy: { date: 'desc' } })
  const present = att.filter(a => a.status === 'Present').length
  return NextResponse.json({
    ...s,
    fullName: `${s.firstName} ${s.lastName}`,
    className: s.class?.name || '-',
    sectionName: s.section?.name || '-',
    attendancePercent: att.length ? Math.round((present/att.length)*100) : 100,
    recentAttendance: att.slice(0, 14),
  })
}
