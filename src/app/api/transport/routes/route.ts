import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function GET() {
  const guard = await requirePerm('transport', 'view')
  if (!guard.ok) return guard.res
  const list = await db.route.findMany({
    include: { vehicles: { include: { driver: true } }, _count: { select: { stops: true } } },
    orderBy: { name: 'asc' },
  })
  const out = list.map(r => ({
    id: r.id, name: r.name, description: r.description, status: r.status,
    stopCount: r._count.stops,
    vehicles: r.vehicles.map(v => ({
      id: v.id, vehicleNo: v.vehicleNo, type: v.type, capacity: v.capacity, status: v.status,
      driverName: v.driver?.name || v.driverName, driverPhone: v.driver?.phone || v.driverPhone,
    })),
  }))
  return NextResponse.json(out)
}

export async function POST(req: NextRequest) {
  const guard = await requirePerm('transport', 'create')
  if (!guard.ok) return guard.res
  const { name, description, vehicleId } = await req.json()
  const route = await db.route.create({ data: { name, description: description || null } })
  if (vehicleId) {
    await db.vehicle.update({ where: { id: vehicleId }, data: { routeId: route.id, routeName: name } })
  }
  return NextResponse.json(route)
}
