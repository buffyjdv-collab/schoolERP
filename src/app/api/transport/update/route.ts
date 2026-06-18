import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Called by the GPS tracking mini-service to update vehicle positions.
// Matches vehicles by routeName (each route = one vehicle in our setup).
export async function POST(req: NextRequest) {
  const updates = await req.json() // array of { id (routeName), lat, lng, speed, heading, status }
  let count = 0
  for (const u of updates) {
    // find vehicle by routeName
    const v = await db.vehicle.findFirst({ where: { routeName: u.id } })
    if (!v) continue
    await db.vehicle.update({ where: { id: v.id }, data: {
      currentLat: u.lat, currentLng: u.lng, speed: u.speed, heading: u.heading,
      status: u.status, lastUpdate: new Date(),
    }}).catch(() => null)
    count++
  }
  return NextResponse.json({ updated: count })
}

export async function GET() {
  const vehicles = await db.vehicle.findMany({ select: { id: true, vehicleNo: true, routeName: true, currentLat: true, currentLng: true, speed: true, heading: true, status: true, lastUpdate: true } })
  return NextResponse.json(vehicles)
}
