import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

// Create a fee invoice for a student (assigns a fee structure to a student)
export async function POST(req: NextRequest) {
  const guard = await requirePerm('fees', 'create')
  if (!guard.ok) return guard.res
  const { studentId, feeStructureId } = await req.json()
  const fs = await db.feeStructure.findUnique({ where: { id: feeStructureId } })
  if (!fs) return NextResponse.json({ error: 'Fee structure not found' }, { status: 400 })
  const count = await db.feeInvoice.count()
  const inv = await db.feeInvoice.create({ data: {
    invoiceNo: 'INV' + String(100001 + count).padStart(6, '0'),
    studentId, feeStructureId, amount: fs.amount, paidAmount: 0, discount: 0, fine: 0,
    dueDate: fs.dueDate || new Date(Date.now() + 30 * 86400000), status: 'Unpaid',
  }})
  return NextResponse.json(inv)
}
