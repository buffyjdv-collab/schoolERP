import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const list = await db.vehicle.findMany({ orderBy: { routeName: 'asc' } })
  return NextResponse.json(list.map(v => ({ ...v, lastUpdate: v.lastUpdate?.toISOString() || null })))
}
