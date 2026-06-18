import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('transport', 'edit')
  if (!guard.ok) return guard.res
  const body = await req.json()
  const d = await db.driver.update({ where: { id }, data: {
    name: body.name, phone: body.phone, licenseNo: body.licenseNo, address: body.address, status: body.status,
  }})
  return NextResponse.json(d)
}

// Assign a driver to a bus (sets Driver.vehicleId — 1:1, unassigns previous)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('transport', 'edit')
  if (!guard.ok) return guard.res
  const { vehicleId } = await req.json()
  // Unassign any driver currently on this vehicle, then assign this driver
  if (vehicleId) {
    await db.driver.updateMany({ where: { vehicleId }, data: { vehicleId: null } })
  }
  const d = await db.driver.update({ where: { id }, data: { vehicleId: vehicleId || null } })
  // Sync legacy driverName/driverPhone on the vehicle for GPS tracker compat
  if (vehicleId) {
    await db.vehicle.update({ where: { id: vehicleId }, data: { driverName: d.name, driverPhone: d.phone } })
  }
  return NextResponse.json(d)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('transport', 'delete')
  if (!guard.ok) return guard.res
  await db.driver.update({ where: { id }, data: { vehicleId: null, status: 'Inactive' } })
  return NextResponse.json({ ok: true })
}
