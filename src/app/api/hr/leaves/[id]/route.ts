import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status } = await req.json()
  const l = await db.leaveRequest.update({ where: { id }, data: { status } })
  return NextResponse.json({ ...l, startDate: l.startDate.toISOString(), endDate: l.endDate.toISOString(), appliedAt: l.appliedAt.toISOString() })
}
