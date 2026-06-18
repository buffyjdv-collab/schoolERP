import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('transport', 'edit')
  if (!guard.ok) return guard.res
  const body = await req.json()
  const s = await db.transportStop.update({ where: { id }, data: {
    name: body.name, routeName: body.routeName, pickupTime: body.pickupTime, dropTime: body.dropTime, fare: body.fare,
  }})
  return NextResponse.json(s)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('transport', 'delete')
  if (!guard.ok) return guard.res
  await db.transportStop.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
