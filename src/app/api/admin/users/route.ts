import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { PERMISSIONS, ALL_MODULES } from '@/lib/rbac'
import type { Role, ModuleId, Action } from '@/lib/rbac'

// List all users with their role-default + custom permissions
export async function GET() {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (me.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden — super admin only' }, { status: 403 })

  const users = await db.user.findMany({
    include: {
      permissions: true,
      teacherClasses: { select: { classId: true } },
      parentLinks: { select: { studentId: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const out = users.map((u) => {
    // Parse overrides
    const overrides: Record<string, any> = {}
    for (const p of u.permissions) {
      overrides[p.module] = {
        actions: p.actions ? JSON.parse(p.actions) : null,
        dataScope: p.dataScope,
        enabled: p.enabled,
      }
    }
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role as Role,
      active: u.active,
      lastLogin: u.lastLogin?.toISOString() || null,
      createdAt: u.createdAt.toISOString(),
      teacherClassCount: u.teacherClasses.length,
      childrenCount: u.parentLinks.length,
      overrides,
    }
  })

  return NextResponse.json({ users: out, roles: Object.keys(PERMISSIONS), modules: ALL_MODULES })
}
