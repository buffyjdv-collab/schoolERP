import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoices = await db.feeInvoice.findMany({ where: { studentId: id }, include: { student: true, feeStructure: { include: { class: true } } }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(invoices.map(inv => ({
    id: inv.id, invoiceNo: inv.invoiceNo, studentId: inv.studentId,
    studentName: `${inv.student.firstName} ${inv.student.lastName}`,
    admissionNo: inv.student.admissionNo, className: inv.feeStructure.class.name,
    feeStructureId: inv.feeStructureId, feeName: inv.feeStructure.name,
    amount: inv.amount, paidAmount: inv.paidAmount, discount: inv.discount, fine: inv.fine,
    dueDate: inv.dueDate.toISOString(), status: inv.status,
    paymentMethod: inv.paymentMethod, paymentDate: inv.paymentDate?.toISOString() || null,
    balance: inv.amount - inv.paidAmount, createdAt: inv.createdAt.toISOString(),
  })))
}
