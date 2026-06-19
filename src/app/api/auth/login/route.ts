import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import { createSessionToken, SESSION_COOKIE } from '@/lib/auth'
import { supportsPerUserOverrides, supportsPerUserDataScope } from '@/lib/rbac'
import type { Role, ModuleId, Action, DataScope, UserOverrides, ModuleOverride } from '@/lib/rbac'

function parseOverrides(perms: any[]): UserOverrides {
  const out: UserOverrides = {}
  for (const p of perms) {
    const ov: ModuleOverride = {}
    if (p.actions !== null && p.actions !== undefined) {
      try { ov.actions = JSON.parse(p.actions) } catch { ov.actions = null }
    }
    if (p.dataScope !== null && p.dataScope !== undefined) ov.dataScope = p.dataScope as DataScope
    if (p.enabled !== null && p.enabled !== undefined) ov.enabled = p.enabled
    out[p.module] = ov
  }
  return out
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  // First fetch the user to determine role
  const baseUser = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, role: true, active: true },
  })
  if (!baseUser || !baseUser.active) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Per-user overrides: full for admin/teacher/transport_manager, dataScope-only for student/parent
  const shouldLoadPerUser = supportsPerUserOverrides(baseUser.role as Role) || supportsPerUserDataScope(baseUser.role as Role)

  const user = await db.user.findUnique({
    where: { id: baseUser.id },
    include: {
      teacherClasses: { select: { classId: true } },
      parentLinks: { select: { studentId: true } },
      ...(shouldLoadPerUser ? { permissions: true } : {}),
    },
  })
  if (!user || !user.active) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  if (!verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  await db.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } })

  // Load role-level overrides for this user's role
  const rolePerms = await db.rolePermission.findMany({ where: { role: user.role } })
  const roleOverrides: Record<string, any> = {}
  for (const r of rolePerms) {
    roleOverrides[r.module] = {
      actions: r.actions ? JSON.parse(r.actions) : null,
      dataScope: r.dataScope,
      enabled: r.enabled,
    }
  }

  const token = createSessionToken(user.id)
  const res = NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    employeeId: user.employeeId,
    studentId: user.studentId,
    teacherClassIds: user.teacherClasses.map((t) => t.classId),
    childrenStudentIds: user.parentLinks.map((p) => p.studentId),
    overrides: shouldLoadPerUser ? parseOverrides((user as any).permissions || []) : {},
    roleOverrides,
  })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })
  return res
}
