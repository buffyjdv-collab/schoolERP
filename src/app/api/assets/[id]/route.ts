import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('assets', 'edit')
  if (!guard.ok) return guard.res
  const body = await req.json()
  const a = await db.asset.update({ where: { id }, data: {
    name: body.name, category: body.category, location: body.location,
    purchaseValue: body.purchaseValue, condition: body.condition, assignedTo: body.assignedTo,
  }})
  return NextResponse.json(a)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('assets', 'delete')
  if (!guard.ok) return guard.res
  await db.asset.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
