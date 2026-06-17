import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const days = 14
  const out: { label: string; present: number; absent: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const [present, absent] = await Promise.all([
      db.attendance.count({ where: { date: d, status: 'Present' } }),
      db.attendance.count({ where: { date: d, status: 'Absent' } }),
    ])
    out.push({ label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), present, absent })
  }
  return NextResponse.json(out)
}
