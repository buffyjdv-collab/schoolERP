import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { canUser } from "@/lib/rbac"

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canUser(user, 'fees', 'view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || undefined
  const q = searchParams.get('q') || ''

  // Role scoping
  let scopeWhere: any = {}
  if (user.role === 'student') {
    scopeWhere = { studentId: user.studentId || '__none__' }
  } else if (user.role === 'parent') {
    scopeWhere = { studentId: { in: user.childrenStudentIds.length ? user.childrenStudentIds : ['__none__'] } }
  } else if (user.role === 'teacher') {
    scopeWhere = { student: { classId: { in: user.teacherClassIds.length ? user.teacherClassIds : ['__none__'] } } }
  }

  const invoices = await db.feeInvoice.findMany({
    where: {
      AND: [
        scopeWhere,
        status ? { status } : {},
        q ? { OR: [{ invoiceNo: { contains: q } }, { student: { firstName: { contains: q } } }, { student: { lastName: { contains: q } } }, { student: { admissionNo: { contains: q } } }] } : {},
      ],
    },
    include: { student: { include: { class: true } }, feeStructure: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })
  return NextResponse.json(invoices.map(inv => ({
    id: inv.id, invoiceNo: inv.invoiceNo, studentId: inv.studentId,
    studentName: `${inv.student.firstName} ${inv.student.lastName}`,
    admissionNo: inv.student.admissionNo, className: inv.student.class?.name || '-',
    feeStructureId: inv.feeStructureId, feeName: inv.feeStructure.name,
    amount: inv.amount, paidAmount: inv.paidAmount, discount: inv.discount, fine: inv.fine,
    dueDate: inv.dueDate.toISOString(), status: inv.status,
    paymentMethod: inv.paymentMethod, paymentDate: inv.paymentDate?.toISOString() || null,
    balance: inv.amount - inv.paidAmount, createdAt: inv.createdAt.toISOString(),
  })))
}
