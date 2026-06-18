import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('academics', 'edit')
  if (!guard.ok) return guard.res
  const { name, capacity, teacherId } = await req.json()
  const sec = await db.section.create({ data: { name, classId: id, capacity: capacity || 40, teacherId: teacherId || null } })
  return NextResponse.json(sec)
}
