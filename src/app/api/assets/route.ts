import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function GET() {
  const guard = await requirePerm('assets', 'view')
  if (!guard.ok) return guard.res
  const list = await db.asset.findMany({ orderBy: { assetCode: 'asc' } })
  return NextResponse.json(list.map(a => ({ ...a, purchaseDate: a.purchaseDate.toISOString() })))
}

export async function POST(req: NextRequest) {
  const guard = await requirePerm('assets', 'create')
  if (!guard.ok) return guard.res
  const body = await req.json()
  const count = await db.asset.count()
  const a = await db.asset.create({ data: {
    assetCode: body.assetCode || `AST${String(101 + count).padStart(4, '0')}`,
    name: body.name, category: body.category, location: body.location || null,
    purchaseValue: body.purchaseValue || 0, condition: body.condition || 'Good', assignedTo: body.assignedTo || null,
  }})
  return NextResponse.json(a)
}
