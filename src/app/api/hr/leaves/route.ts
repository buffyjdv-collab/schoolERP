import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const list = await db.leaveRequest.findMany({ include: { employee: true }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(list.map(l => ({
    id: l.id, employeeId: l.employeeId, employeeName: `${l.employee.firstName} ${l.employee.lastName}`,
    empCode: l.employee.empCode, designation: l.employee.designation,
    leaveType: l.leaveType, startDate: l.startDate.toISOString(), endDate: l.endDate.toISOString(),
    reason: l.reason, status: l.status, appliedAt: l.appliedAt.toISOString(),
  })))
}
