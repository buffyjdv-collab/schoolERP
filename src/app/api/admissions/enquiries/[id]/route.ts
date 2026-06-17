import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const e = await db.admissionEnquiry.update({ where: { id }, data: { status: body.status } })
  return NextResponse.json({ ...e, createdAt: e.createdAt.toISOString() })
}
