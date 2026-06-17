import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const list = await db.asset.findMany({ orderBy: { assetCode: 'asc' } })
  return NextResponse.json(list.map(a => ({ ...a, purchaseDate: a.purchaseDate.toISOString() })))
}
