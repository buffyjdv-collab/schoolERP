import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { PERMISSIONS } from '@/lib/rbac'
import type { Role, ModuleId, Action, DataScope } from '@/lib/rbac'

// GET: hardcoded defaults + DB overrides for a specific role
export async function GET(_req: NextRequest, { params }: { params: Promise<{ role: string }> }) {
  const { role } = await params
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (me.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden — super admin only' }, { status: 403 })

  if (role === 'super_admin') return NextResponse.json({ error: 'Super admin permissions cannot be modified' }, { status: 400 })

  const rolePerms = await db.rolePermission.findMany({ where: { role } })
  const overrides: Record<string, any> = {}
  for (const p of rolePerms) {
    overrides[p.module] = {
      actions: p.actions ? JSON.parse(p.actions) : null,
      dataScope: p.dataScope,
      enabled: p.enabled,
    }
  }

  return NextResponse.json({
    role: role as Role,
    defaults: PERMISSIONS[role as Role] || {},
    overrides,
    userCount: await db.user.count({ where: { role } }),
  })
}

// PUT: save role-level permission overrides (affects ALL users with this role)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ role: string }> }) {
  const { role } = await params
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (me.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden — super admin only' }, { status: 403 })
  if (role === 'super_admin') return NextResponse.json({ error: 'Super admin permissions cannot be modified' }, { status: 400 })

  const body = await req.json()

  await db.rolePermission.deleteMany({ where: { role } })

  const validActions: Action[] = ['view','create','edit','delete','approve','export','collect','mark','enter','send','issue','return','pay','run']
  const validScopes: DataScope[] = ['all','own','children','assigned_classes','none']

  for (const [module, ov] of Object.entries(body.overrides || {})) {
    const mod = module as ModuleId
    const o = ov as any
    const hasActions = o.actions !== undefined && o.actions !== null
    const hasScope = o.dataScope !== undefined && o.dataScope !== null
    const hasEnabled = o.enabled !== undefined && o.enabled !== null
    if (!hasActions && !hasScope && !hasEnabled) continue

    const actions = hasActions ? JSON.stringify((o.actions as Action[]).filter(a => validActions.includes(a))) : null
    const dataScope = hasScope && validScopes.includes(o.dataScope) ? o.dataScope : null
    const enabled = hasEnabled ? !!o.enabled : null

    await db.rolePermission.create({ data: { role, module: mod, actions, dataScope, enabled } })
  }

  return NextResponse.json({ ok: true, affectedUsers: await db.user.count({ where: { role } }) })
}

// DELETE: reset role overrides back to hardcoded defaults
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ role: string }> }) {
  const { role } = await params
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (me.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden — super admin only' }, { status: 403 })

  await db.rolePermission.deleteMany({ where: { role } })
  return NextResponse.json({ ok: true })
}
