import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { PERMISSIONS, ROLE_LABELS, ROLE_DESCRIPTIONS, ALL_MODULES, MODULE_LABELS, MODULE_ACTIONS } from '@/lib/rbac'
import type { Role } from '@/lib/rbac'

// GET: all roles with their effective permissions (static defaults + DB overrides)
export async function GET() {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (me.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden — super admin only' }, { status: 403 })

  // Load all DB role overrides
  const dbOverrides = await db.rolePermission.findMany()
  const overridesByRole: Record<string, Record<string, any>> = {}
  for (const r of dbOverrides) {
    if (!overridesByRole[r.role]) overridesByRole[r.role] = {}
    overridesByRole[r.role][r.module] = {
      actions: r.actions ? JSON.parse(r.actions) : null,
      dataScope: r.dataScope,
      enabled: r.enabled,
    }
  }

  // Build role list with effective permissions per module
  const roles = Object.keys(PERMISSIONS).filter(r => r !== 'super_admin').map(roleKey => {
    const role = roleKey as Role
    const staticPerms = PERMISSIONS[role] || {}
    const dbOv = overridesByRole[role] || {}
    const modulePerms = ALL_MODULES.map(mod => {
      const ov = dbOv[mod]
      let effectiveActions: string[] = []
      let enabled = true
      if (ov?.enabled === false) { enabled = false; effectiveActions = [] }
      else if (ov?.actions) { effectiveActions = ov.actions; enabled = true }
      else { effectiveActions = staticPerms[mod] || []; enabled = (staticPerms[mod] || []).length > 0 }
      return {
        module: mod,
        label: MODULE_LABELS[mod],
        staticDefault: staticPerms[mod] || [],
        override: ov || null,
        effectiveActions,
        enabled,
        availableActions: MODULE_ACTIONS[mod] || ['view'],
        dataScope: ov?.dataScope || (role === 'student' ? 'own' : role === 'parent' ? 'children' : role === 'teacher' ? 'assigned_classes' : 'all'),
      }
    })
    return {
      role,
      label: ROLE_LABELS[role],
      description: ROLE_DESCRIPTIONS[role],
      moduleCount: modulePerms.filter(m => m.enabled).length,
      modules: modulePerms,
    }
  })

  // Count users per role
  const userCounts = await db.user.groupBy({ by: ['role'], _count: true })
  const countMap: Record<string, number> = {}
  for (const c of userCounts) countMap[c.role] = c._count

  return NextResponse.json({
    roles: roles.map(r => ({ ...r, userCount: countMap[r.role] || 0 })),
    superAdminLocked: true,
  })
}
