import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requirePerm('academics', 'edit')
  if (!guard.ok) return guard.res
  const { name, code, teacherId } = await req.json()
  const sub = await db.subject.create({ data: { name, code: code || name.slice(0,3).toUpperCase(), classId: id, teacherId: teacherId || null } })
  return NextResponse.json(sub)
}
