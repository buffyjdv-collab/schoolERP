import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('transport', 'edit')
  if (!guard.ok) return guard.res
  const body = await req.json()
  const r = await db.route.update({ where: { id }, data: { name: body.name, description: body.description, status: body.status || 'Active' } })
  // If renaming, sync routeName on vehicles + stops
  if (body.name) {
    await db.vehicle.updateMany({ where: { routeId: id }, data: { routeName: body.name } })
    await db.transportStop.updateMany({ where: { routeId: id }, data: { routeName: body.name } })
  }
  return NextResponse.json(r)
}

// Assign a bus (vehicle) to this route
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('transport', 'edit')
  if (!guard.ok) return guard.res
  const { vehicleId } = await req.json()
  const route = await db.route.findUnique({ where: { id } })
  if (!route) return NextResponse.json({ error: 'Route not found' }, { status: 404 })
  if (vehicleId) {
    await db.vehicle.update({ where: { id: vehicleId }, data: { routeId: id, routeName: route.name } })
  } else {
    // unassign all vehicles from this route
    await db.vehicle.updateMany({ where: { routeId: id }, data: { routeId: null } })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('transport', 'delete')
  if (!guard.ok) return guard.res
  // Unlink vehicles + stops, then delete
  await db.vehicle.updateMany({ where: { routeId: id }, data: { routeId: null } })
  await db.transportStop.updateMany({ where: { routeId: id }, data: { routeId: null } })
  await db.student.updateMany({ where: { routeId: id }, data: { routeId: null, transportRouteId: null } })
  await db.route.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
