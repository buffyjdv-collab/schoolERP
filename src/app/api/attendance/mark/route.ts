import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { studentId, date, status, method } = await req.json()
  const d = new Date(date); d.setHours(0,0,0,0)
  const rec = await db.attendance.upsert({
    where: { studentId_date: { studentId, date: d } },
    create: { studentId, date: d, status, method: method || 'Manual' },
    update: { status, method: method || 'Manual' },
  })
  return NextResponse.json(rec)
}
