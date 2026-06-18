import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'
import { NextRequest } from 'next/server'

export async function GET() {
  const guard = await requirePerm('fees', 'view')
  if (!guard.ok) return guard.res
  const list = await db.feeStructure.findMany({ include: { class: true }, orderBy: { class: { name: 'asc' } } })
  return NextResponse.json(list.map(f => ({ id: f.id, name: f.name, classId: f.classId, className: f.class.name, amount: f.amount, frequency: f.frequency, dueDate: f.dueDate?.toISOString() || null })))
}

export async function POST(req: NextRequest) {
  const guard = await requirePerm('fees', 'create')
  if (!guard.ok) return guard.res
  const body = await req.json()
  const fs = await db.feeStructure.create({ data: {
    name: body.name, classId: body.classId, amount: body.amount, frequency: body.frequency || 'Annual',
    dueDate: body.dueDate ? new Date(body.dueDate) : null,
  }})
  return NextResponse.json(fs)
}
