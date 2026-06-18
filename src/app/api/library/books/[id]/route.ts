import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('library', 'edit')
  if (!guard.ok) return guard.res
  const body = await req.json()
  const b = await db.book.update({ where: { id }, data: {
    title: body.title, author: body.author, category: body.category, publisher: body.publisher,
    price: body.price, totalCopies: body.totalCopies, rack: body.rack,
  }})
  return NextResponse.json(b)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('library', 'delete')
  if (!guard.ok) return guard.res
  await db.book.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
