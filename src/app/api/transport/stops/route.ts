import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const list = await db.transportStop.findMany({ orderBy: { routeName: 'asc' } })
  return NextResponse.json(list)
}
