import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'super_admin' && user.role !== 'admin' && user.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
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
