import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function GET() {
  const guard = await requirePerm('hr', 'view')
  if (!guard.ok) return guard.res
  const list = await db.leaveRequest.findMany({ include: { employee: true }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(list.map(l => ({
    id: l.id, employeeId: l.employeeId, employeeName: `${l.employee.firstName} ${l.employee.lastName}`,
    empCode: l.employee.empCode, designation: l.employee.designation,
    leaveType: l.leaveType, startDate: l.startDate.toISOString(), endDate: l.endDate.toISOString(),
    reason: l.reason, status: l.status, appliedAt: l.appliedAt.toISOString(),
  })))
}
