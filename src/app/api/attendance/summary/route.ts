import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const classId = searchParams.get('classId') || undefined
  const today = new Date(); today.setHours(0,0,0,0)

  const where = classId ? { student: { classId } } : {}
  const records = await db.attendance.findMany({ where: { ...where, date: today }, include: { student: true } })
  const present = records.filter(r => r.status === 'Present').length
  const absent = records.filter(r => r.status === 'Absent').length
  const late = records.filter(r => r.status === 'Late').length
  const leave = records.filter(r => r.status === 'Leave').length
  const total = records.length || 1
  const rate = Math.round((present / total) * 100)

  // by class
  const classes = await db.class.findMany({ include: { _count: { select: { students: true } } } })
  const byClass: { label: string; rate: number }[] = []
  for (const c of classes) {
    const classRecords = await db.attendance.findMany({ where: { date: today, student: { classId: c.id } }, select: { status: true } })
    const p = classRecords.filter(r => r.status === 'Present').length
    byClass.push({ label: c.name, rate: classRecords.length ? Math.round((p/classRecords.length)*100) : 0 })
  }

  return NextResponse.json({ rate, present, absent, late, leave, byClass })
}
