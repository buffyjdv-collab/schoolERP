import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function GET() {
  const guard = await requirePerm('communication', 'view')
  if (!guard.ok) return guard.res
  const list = await db.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
  return NextResponse.json(list.map(n => ({ ...n, createdAt: n.createdAt.toISOString() })))
}
