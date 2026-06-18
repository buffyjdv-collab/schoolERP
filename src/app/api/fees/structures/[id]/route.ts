import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('fees', 'edit')
  if (!guard.ok) return guard.res
  const body = await req.json()
  const fs = await db.feeStructure.update({ where: { id }, data: {
    name: body.name, amount: body.amount, frequency: body.frequency, dueDate: body.dueDate ? new Date(body.dueDate) : null,
  }})
  return NextResponse.json(fs)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('fees', 'delete')
  if (!guard.ok) return guard.res
  await db.feeStructure.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
