import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('academics', 'edit')
  if (!guard.ok) return guard.res
  const body = await req.json()
  const s = await db.subject.update({ where: { id }, data: {
    name: body.name,
    code: body.code,
    teacherId: body.teacherId || null,
  }})
  return NextResponse.json(s)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('academics', 'delete')
  if (!guard.ok) return guard.res
  // Check if exam marks exist for this subject
  const marksCount = await db.examMark.count({ where: { subject: { equals: (await db.subject.findUnique({ where: { id } }))?.name || '' } } })
  if (marksCount > 0) {
    return NextResponse.json({ error: `Cannot delete: ${marksCount} exam marks reference this subject.` }, { status: 400 })
  }
  await db.subject.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
