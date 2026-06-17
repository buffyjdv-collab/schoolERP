import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const list = await db.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
  return NextResponse.json(list.map(n => ({ ...n, createdAt: n.createdAt.toISOString() })))
}
