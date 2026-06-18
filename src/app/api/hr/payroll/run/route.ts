import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const guard = await requirePerm('hr', 'run')
  if (!guard.ok) return guard.res
  const { month } = await req.json()
  const employees = await db.employee.findMany({ where: { status: 'Active' } })
  let created = 0
  for (const e of employees) {
    const existing = await db.payroll.findUnique({ where: { employeeId_month: { employeeId: e.id, month } } })
    if (existing) continue
    const basic = e.salary
    const allowances = basic * 0.2
    const deductions = basic * 0.1
    await db.payroll.create({ data: { employeeId: e.id, month, basicSalary: basic, allowances, deductions, netPay: basic + allowances - deductions, status: 'Processed' } })
    created++
  }
  return NextResponse.json({ created, total: employees.length })
}
