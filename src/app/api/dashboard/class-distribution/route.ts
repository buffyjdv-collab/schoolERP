import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'super_admin' && user.role !== 'admin' && user.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const classes = await db.class.findMany({ include: { _count: { select: { students: true } } }, orderBy: { name: 'asc' } })
  return NextResponse.json(classes.map(c => ({ label: c.name, value: c._count.students })))
}
