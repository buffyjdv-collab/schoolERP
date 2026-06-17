import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const list = await db.application.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(list.map(a => ({ ...a, createdAt: a.createdAt.toISOString(), dob: a.dob?.toISOString() || null })))
}
