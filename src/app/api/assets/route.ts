import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function GET() {
  const guard = await requirePerm('assets', 'view')
  if (!guard.ok) return guard.res
  const list = await db.asset.findMany({ orderBy: { assetCode: 'asc' } })
  return NextResponse.json(list.map(a => ({ ...a, purchaseDate: a.purchaseDate.toISOString() })))
}
