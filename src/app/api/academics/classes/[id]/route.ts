import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('academics', 'edit')
  if (!guard.ok) return guard.res
  const { name } = await req.json()
  const cls = await db.class.update({ where: { id }, data: { name } })
  return NextResponse.json(cls)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('academics', 'delete')
  if (!guard.ok) return guard.res
  await db.class.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
