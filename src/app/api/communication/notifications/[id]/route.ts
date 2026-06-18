import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('communication', 'delete')
  if (!guard.ok) return guard.res
  await db.notification.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
