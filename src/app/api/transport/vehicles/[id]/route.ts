import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('transport', 'edit')
  if (!guard.ok) return guard.res
  const body = await req.json()
  const v = await db.vehicle.update({ where: { id }, data: {
    vehicleNo: body.vehicleNo, driverName: body.driverName, driverPhone: body.driverPhone,
    routeName: body.routeName, capacity: body.capacity, status: body.status,
  }})
  return NextResponse.json(v)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('transport', 'delete')
  if (!guard.ok) return guard.res
  await db.vehicle.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
