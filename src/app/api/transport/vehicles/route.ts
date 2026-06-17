import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function GET() {
  const guard = await requirePerm('transport', 'view')
  if (!guard.ok) return guard.res
  const list = await db.vehicle.findMany({ orderBy: { routeName: 'asc' } })
  return NextResponse.json(list.map(v => ({ ...v, lastUpdate: v.lastUpdate?.toISOString() || null })))
}
