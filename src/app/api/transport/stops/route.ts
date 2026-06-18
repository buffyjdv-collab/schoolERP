import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function GET() {
  const guard = await requirePerm('transport', 'view')
  if (!guard.ok) return guard.res
  const list = await db.transportStop.findMany({ orderBy: { routeName: 'asc' } })
  return NextResponse.json(list)
}

export async function POST(req: any) {
  const guard = await requirePerm('transport', 'create')
  if (!guard.ok) return guard.res
  const body = await req.json()
  const stop = await db.transportStop.create({ data: {
    name: body.name, routeName: body.routeName, lat: body.lat, lng: body.lng,
    pickupTime: body.pickupTime, dropTime: body.dropTime, fare: body.fare || 0,
  }})
  return NextResponse.json(stop)
}
