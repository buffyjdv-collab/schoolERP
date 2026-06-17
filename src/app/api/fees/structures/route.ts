import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function GET() {
  const guard = await requirePerm('fees', 'view')
  if (!guard.ok) return guard.res
  const list = await db.feeStructure.findMany({ include: { class: true }, orderBy: { class: { name: 'asc' } } })
  return NextResponse.json(list.map(f => ({ id: f.id, name: f.name, classId: f.classId, className: f.class.name, amount: f.amount, frequency: f.frequency, dueDate: f.dueDate?.toISOString() || null })))
}
