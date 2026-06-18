import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function GET() {
  const guard = await requirePerm('transport', 'view')
  if (!guard.ok) return guard.res
  const list = await db.vehicle.findMany({ orderBy: { routeName: 'asc' } })
  return NextResponse.json(list.map(v => ({ ...v, lastUpdate: v.lastUpdate?.toISOString() || null })))
}

export async function POST(req: NextRequest) {
  const guard = await requirePerm('transport', 'create')
  if (!guard.ok) return guard.res
  const body = await req.json()
  const v = await db.vehicle.create({ data: {
    vehicleNo: body.vehicleNo, type: body.type || 'Bus', capacity: body.capacity || 45,
    driverName: body.driverName, driverPhone: body.driverPhone, routeName: body.routeName,
    gpsDeviceId: body.gpsDeviceId || null, status: 'Idle',
  }})
  return NextResponse.json(v)
}
