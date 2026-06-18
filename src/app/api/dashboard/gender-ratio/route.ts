import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'super_admin' && user.role !== 'admin' && user.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const [male, female] = await Promise.all([
    db.student.count({ where: { gender: 'Male', status: 'Active' } }),
    db.student.count({ where: { gender: 'Female', status: 'Active' } }),
  ])
  return NextResponse.json([
    { label: 'Male', value: male },
    { label: 'Female', value: female },
  ])
}
