import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, resetRoleOverridesCache } from '@/lib/auth'
import { PERMISSIONS } from '@/lib/rbac'
import type { Role, ModuleId, Action, DataScope } from '@/lib/rbac'

// GET: effective permissions for a single role
export async function GET(_req: NextRequest, { params }: { params: Promise<{ role: string }> }) {
  const { role } = await params
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (me.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (role === 'super_admin') return NextResponse.json({ error: 'Cannot modify super admin' }, { status: 400 })

  const dbOv = await db.rolePermission.findMany({ where: { role } })
  const overrides: Record<string, any> = {}
  for (const r of dbOv) {
    overrides[r.module] = { actions: r.actions ? JSON.parse(r.actions) : null, dataScope: r.dataScope, enabled: r.enabled }
  }
  return NextResponse.json({ role, staticDefaults: PERMISSIONS[role as Role] || {}, overrides })
}

// PUT: save role-level permission overrides
export async function PUT(req: NextRequest, { params }: { params: Promise<{ role: string }> }) {
  const { role } = await params
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (me.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden — super admin only' }, { status: 403 })
  if (role === 'super_admin') return NextResponse.json({ error: 'Cannot modify super admin role' }, { status: 400 })

  const body = await req.json() // { overrides: { [module]: { actions?, dataScope?, enabled? } } }

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

  // Reset the in-memory cache so the new overrides take effect on next request
  resetRoleOverridesCache()

  return NextResponse.json({ ok: true, role })
}

// DELETE: reset all role overrides back to static code defaults
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ role: string }> }) {
  const { role } = await params
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (me.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (role === 'super_admin') return NextResponse.json({ error: 'Cannot reset super admin' }, { status: 400 })

  await db.rolePermission.deleteMany({ where: { role } })
  resetRoleOverridesCache()
  return NextResponse.json({ ok: true })
}
