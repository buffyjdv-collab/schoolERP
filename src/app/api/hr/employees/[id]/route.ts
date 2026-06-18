import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('hr', 'edit')
  if (!guard.ok) return guard.res
  const body = await req.json()
  const emp = await db.employee.update({ where: { id }, data: {
    firstName: body.firstName, lastName: body.lastName, designation: body.designation,
    department: body.department, phone: body.phone, email: body.email || null,
    address: body.address || null, salary: body.salary ?? undefined, status: body.status || 'Active',
  }})
  return NextResponse.json(emp)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('hr', 'delete')
  if (!guard.ok) return guard.res
  await db.employee.update({ where: { id }, data: { status: 'Resigned' } })
  return NextResponse.json({ ok: true })
}
