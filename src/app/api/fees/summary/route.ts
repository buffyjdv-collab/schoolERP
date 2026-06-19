import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { canUser } from "@/lib/rbac"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canUser(user, 'fees', 'view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Role-scoped invoice filter
  let scopeWhere: any = {}
  if (user.role === 'student') scopeWhere = { studentId: user.studentId || '__none__' }
  else if (user.role === 'parent') scopeWhere = { studentId: { in: user.childrenStudentIds.length ? user.childrenStudentIds : ['__none__'] } }
  else if (user.role === 'teacher') scopeWhere = { student: { classId: { in: user.teacherClassIds.length ? user.teacherClassIds : ['__none__'] } } }

  const invoices = await db.feeInvoice.findMany({ where: scopeWhere, select: { paidAmount: true, amount: true, status: true, paymentMethod: true } })
  const collected = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0)
  const pending = invoices.reduce((s, i) => s + Math.max(0, i.amount - (i.paidAmount || 0)), 0)

  // Defaulters count: staff see institution-wide; student/parent see their own/children's overdue count
  let defaulters: number
  if (user.role === 'super_admin' || user.role === 'admin') {
    defaulters = await db.student.count({ where: { feeInvoices: { some: { status: { in: ['Overdue','Unpaid'] } } }, status: 'Active' } })
  } else {
    defaulters = invoices.filter(i => i.status === 'Overdue' || i.status === 'Unpaid').length
  }

  const byStatusMap = new Map<string, number>()
  for (const i of invoices) byStatusMap.set(i.status, (byStatusMap.get(i.status) || 0) + 1)
  const byStatus = [...byStatusMap.entries()].map(([label, value]) => ({ label, value }))
  const byMethodMap = new Map<string, number>()
  for (const i of invoices) if (i.paymentMethod) byMethodMap.set(i.paymentMethod, (byMethodMap.get(i.paymentMethod) || 0) + (i.paidAmount || 0))
  const byMethod = [...byMethodMap.entries()].map(([label, value]) => ({ label, value }))

  return NextResponse.json({ collected, pending, defaulters, byStatus, byMethod })
}
