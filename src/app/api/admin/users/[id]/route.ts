import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// Change a user's role
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (me.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden — super admin only' }, { status: 403 })
  if (id === me.id) return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })

  const { role } = await req.json()
  const validRoles = ['super_admin', 'admin', 'transport_manager', 'teacher', 'student', 'parent']
  if (!validRoles.includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const user = await db.user.update({ where: { id }, data: { role } })
  return NextResponse.json({ ok: true, id: user.id, role: user.role })
}

// Toggle user active status
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (me.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden — super admin only' }, { status: 403 })
  if (id === me.id) return NextResponse.json({ error: 'Cannot deactivate yourself' }, { status: 400 })

  const { active } = await req.json()
  const user = await db.user.update({ where: { id }, data: { active: !!active } })
  return NextResponse.json({ ok: true, id: user.id, active: user.active })
}
