import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { PERMISSIONS } from '@/lib/rbac'
import type { Role, ModuleId, Action, DataScope } from '@/lib/rbac'

// GET: effective permissions for a user (role defaults + overrides)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (me.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden — super admin only' }, { status: 403 })

  const user = await db.user.findUnique({
    where: { id },
    include: { permissions: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const role = user.role as Role
  const rolePerms = PERMISSIONS[role] || {}

  // Build the effective permission map per module
  const overrides: Record<string, any> = {}
  for (const p of user.permissions) {
    overrides[p.module] = {
      actions: p.actions ? JSON.parse(p.actions) : null,
      dataScope: p.dataScope,
      enabled: p.enabled,
    }
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, active: user.active },
    roleDefaults: rolePerms,
    overrides,
  })
}

// PUT: save per-user permission overrides
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (me.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden — super admin only' }, { status: 403 })
  if (id === me.id) return NextResponse.json({ error: ' Cannot modify your own permissions' }, { status: 400 })

  const body = await req.json() // { overrides: { [module]: { actions?, dataScope?, enabled? } } }
  const targetUser = await db.user.findUnique({ where: { id } })
  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (targetUser.role === 'super_admin') return NextResponse.json({ error: 'Cannot restrict a super admin' }, { status: 400 })
  // For student/parent: only dataScope overrides are allowed (no action/enabled/module-toggle)
  const isDataScopeOnly = targetUser.role === 'student' || targetUser.role === 'parent'

  // Delete existing overrides, then recreate
  await db.userPermission.deleteMany({ where: { userId: id } })

  const validActions: Action[] = ['view','create','edit','delete','approve','export','collect','mark','enter','send','issue','return','pay','run']
  const validScopes: DataScope[] = ['all','own','children','assigned_classes','none']

  for (const [module, ov] of Object.entries(body.overrides || {})) {
    const mod = module as ModuleId
    const o = ov as any
    const hasScope = o.dataScope !== undefined && o.dataScope !== null
    // For student/parent: ONLY save dataScope (ignore actions/enabled)
    if (isDataScopeOnly) {
      if (!hasScope) continue
      if (!validScopes.includes(o.dataScope)) continue
      await db.userPermission.create({
        data: { userId: id, module: mod, actions: null, dataScope: o.dataScope, enabled: null },
      })
      continue
    }
    // For admin/teacher/transport_manager: full overrides (actions + dataScope + enabled)
    const hasActions = o.actions !== undefined && o.actions !== null
    const hasEnabled = o.enabled !== undefined && o.enabled !== null
    if (!hasActions && !hasScope && !hasEnabled) continue

    const actions = hasActions ? JSON.stringify((o.actions as Action[]).filter(a => validActions.includes(a))) : null
    const dataScope = hasScope && validScopes.includes(o.dataScope) ? o.dataScope : null
    const enabled = hasEnabled ? !!o.enabled : null

    await db.userPermission.create({
      data: { userId: id, module: mod, actions, dataScope, enabled },
    })
  }

  return NextResponse.json({ ok: true })
}

// DELETE: reset all overrides for a user (back to role defaults)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (me.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden — super admin only' }, { status: 403 })

  await db.userPermission.deleteMany({ where: { userId: id } })
  return NextResponse.json({ ok: true })
}
