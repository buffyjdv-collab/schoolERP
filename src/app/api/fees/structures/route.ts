import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const list = await db.feeStructure.findMany({ include: { class: true }, orderBy: { class: { name: 'asc' } } })
  return NextResponse.json(list.map(f => ({ id: f.id, name: f.name, classId: f.classId, className: f.class.name, amount: f.amount, frequency: f.frequency, dueDate: f.dueDate?.toISOString() || null })))
}
