import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function GET() {
  const guard = await requirePerm('admissions', 'view')
  if (!guard.ok) return guard.res
  const list = await db.application.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(list.map(a => ({ ...a, createdAt: a.createdAt.toISOString(), dob: a.dob?.toISOString() || null })))
}
