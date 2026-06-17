import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const invoices = await db.feeInvoice.findMany({ select: { paidAmount: true, amount: true, status: true, paymentMethod: true } })
  const collected = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0)
  const pending = invoices.reduce((s, i) => s + Math.max(0, i.amount - (i.paidAmount || 0)), 0)
  const defaulters = await db.student.count({ where: { feeInvoices: { some: { status: { in: ['Overdue','Unpaid'] } } }, status: 'Active' } })

  const byStatusMap = new Map<string, number>()
  for (const i of invoices) byStatusMap.set(i.status, (byStatusMap.get(i.status) || 0) + 1)
  const byStatus = [...byStatusMap.entries()].map(([label, value]) => ({ label, value }))

  const byMethodMap = new Map<string, number>()
  for (const i of invoices) if (i.paymentMethod) byMethodMap.set(i.paymentMethod, (byMethodMap.get(i.paymentMethod) || 0) + (i.paidAmount || 0))
  const byMethod = [...byMethodMap.entries()].map(([label, value]) => ({ label, value }))

  return NextResponse.json({ collected, pending, defaulters, byStatus, byMethod })
}
