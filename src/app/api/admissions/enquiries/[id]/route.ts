import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const action = body.status === 'Approved' || body.status === 'Rejected' ? 'approve' : 'edit'
  const guard = await requirePerm('admissions', action as any)
  if (!guard.ok) return guard.res
  const e = await db.admissionEnquiry.update({ where: { id }, data: { status: body.status } })
  return NextResponse.json({ ...e, createdAt: e.createdAt.toISOString() })
}
