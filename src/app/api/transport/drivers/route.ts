import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function GET() {
  const guard = await requirePerm('transport', 'view')
  if (!guard.ok) return guard.res
  const list = await db.driver.findMany({ include: { vehicle: true }, orderBy: { name: 'asc' } })
  return NextResponse.json(list.map(d => ({
    id: d.id, name: d.name, phone: d.phone, licenseNo: d.licenseNo, address: d.address,
    joiningDate: d.joiningDate.toISOString(), status: d.status,
    vehicleId: d.vehicleId, vehicleNo: d.vehicle?.vehicleNo || null, routeName: d.vehicle?.routeName || null,
  })))
}

export async function POST(req: NextRequest) {
  const guard = await requirePerm('transport', 'create')
  if (!guard.ok) return guard.res
  const body = await req.json()
  const d = await db.driver.create({ data: {
    name: body.name, phone: body.phone, licenseNo: body.licenseNo || null,
    address: body.address || null, status: 'Active',
  }})
  return NextResponse.json(d)
}
