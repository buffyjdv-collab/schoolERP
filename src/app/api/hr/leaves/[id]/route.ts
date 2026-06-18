import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status } = await req.json()
  // Approval requires 'approve' permission; status changes to PrincipalApproved/HODApproved need approve
  const action = status === 'Rejected' ? 'approve' : 'approve'
  const guard = await requirePerm('hr', action as any)
  if (!guard.ok) return guard.res
  const l = await db.leaveRequest.update({ where: { id }, data: { status } })
  return NextResponse.json({ ...l, startDate: l.startDate.toISOString(), endDate: l.endDate.toISOString(), appliedAt: l.appliedAt.toISOString() })
}
