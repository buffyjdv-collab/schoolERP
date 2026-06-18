import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const guard = await requirePerm('hr', 'view')
  if (!guard.ok) return guard.res
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') || new Date().toISOString().slice(0,7)
  const list = await db.payroll.findMany({ where: { month }, include: { employee: true }, orderBy: { employee: { empCode: 'asc' } } })
  return NextResponse.json(list.map(p => ({
    id: p.id, employeeId: p.employeeId, employeeName: `${p.employee.firstName} ${p.employee.lastName}`,
    empCode: p.employee.empCode, month: p.month, basicSalary: p.basicSalary,
    allowances: p.allowances, deductions: p.deductions, netPay: p.netPay, status: p.status,
    paidAt: p.paidAt?.toISOString() || null,
  })))
}
