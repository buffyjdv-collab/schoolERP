import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { paidAmount, paymentMethod } = await req.json()
  const inv = await db.feeInvoice.findUnique({ where: { id } })
  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const newPaid = (inv.paidAmount || 0) + Number(paidAmount)
  const status = newPaid >= inv.amount ? 'Paid' : newPaid > 0 ? 'Partial' : inv.status
  const updated = await db.feeInvoice.update({ where: { id }, data: {
    paidAmount: newPaid, status, paymentMethod, paymentDate: new Date(),
  }})
  return NextResponse.json({ ...updated, dueDate: updated.dueDate.toISOString(), paymentDate: updated.paymentDate?.toISOString() || null, balance: updated.amount - newPaid, createdAt: updated.createdAt.toISOString() })
}
