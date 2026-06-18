import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'super_admin' && user.role !== 'admin' && user.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const invoices = await db.feeInvoice.findMany({ select: { paidAmount: true, amount: true, status: true, createdAt: true } })
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const now = new Date()
  const buckets: { label: string; collected: number; pending: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = months[d.getMonth()]
    const inMonth = invoices.filter(inv => new Date(inv.createdAt).getMonth() === d.getMonth() && new Date(inv.createdAt).getFullYear() === d.getFullYear())
    const collected = inMonth.reduce((s, i) => s + (i.paidAmount || 0), 0)
    const pending = inMonth.reduce((s, i) => s + Math.max(0, (i.amount - (i.paidAmount || 0))), 0)
    buckets.push({ label, collected, pending })
  }
  return NextResponse.json(buckets)
}
