import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/rbac'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const inv = await db.feeInvoice.findUnique({ where: { id }, include: { student: true } })
  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Permission: admin/super_admin can collect; student can pay own; parent can pay children's
  const mayCollect = can(user.role, 'fees', 'collect')
  const mayPay = can(user.role, 'fees', 'pay')
  const ownsInvoice = (user.role === 'student' && inv.studentId === user.studentId)
    || (user.role === 'parent' && user.childrenStudentIds.includes(inv.studentId))
  if (!mayCollect && !(mayPay && ownsInvoice)) {
    return NextResponse.json({ error: 'Forbidden — you cannot pay this invoice' }, { status: 403 })
  }

  const { paidAmount, paymentMethod } = await req.json()
  const newPaid = (inv.paidAmount || 0) + Number(paidAmount)
  const status = newPaid >= inv.amount ? 'Paid' : newPaid > 0 ? 'Partial' : inv.status
  const updated = await db.feeInvoice.update({ where: { id }, data: {
    paidAmount: newPaid, status, paymentMethod, paymentDate: new Date(),
  }})
  return NextResponse.json({ ...updated, dueDate: updated.dueDate.toISOString(), paymentDate: updated.paymentDate?.toISOString() || null, balance: updated.amount - newPaid, createdAt: updated.createdAt.toISOString() })
}
