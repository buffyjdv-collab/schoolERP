// Server-side auth: HMAC-signed session cookie + getCurrentUser().
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { NextResponse } from 'next/server'
import { db } from './db'
import { canUser, setRoleOverridesCache } from './rbac'
import type { AuthUser, Role, ModuleId, Action, UserOverrides, ModuleOverride, DataScope, RoleOverrides, RoleOverride } from './rbac'

const SECRET = process.env.AUTH_SECRET || 'vidyamatrix-dev-secret-9f3k2j'
const COOKIE_NAME = 'erp_session'
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

function sign(payload: string): string {
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex')
  return `${payload}.${sig}`
}

function verifyToken(token: string): { uid: string; exp: number } | null {
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = createHmac('sha256', SECRET).update(payload).digest('hex')
  if (sig !== expected) return null
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { uid: string; exp: number }
    if (Date.now() > decoded.exp) return null
    return decoded
  } catch {
    return null
  }
}

export function createSessionToken(userId: string): string {
  const payload = JSON.stringify({ uid: userId, exp: Date.now() + SESSION_TTL })
  const encoded = Buffer.from(payload).toString('base64url')
  return sign(encoded)
}

export const SESSION_COOKIE = COOKIE_NAME

/** Parse DB UserPermission rows into a UserOverrides map. */
function parseOverrides(perms: any[]): UserOverrides {
  const out: UserOverrides = {}
  for (const p of perms) {
    const mod = p.module as ModuleId
    const ov: ModuleOverride = {}
    if (p.actions !== null) {
      try { ov.actions = JSON.parse(p.actions) } catch { ov.actions = null }
    }
    if (p.dataScope !== null) ov.dataScope = p.dataScope as DataScope
    if (p.enabled !== null) ov.enabled = p.enabled
    out[mod] = ov
  }
  return out
}

/** Load ALL role-level overrides from DB into the in-memory cache. Called once per request. */
let roleOverridesLoaded = false
async function loadRoleOverridesOnce() {
  if (roleOverridesLoaded) return
  try {
    const rows = await db.rolePermission.findMany()
    const cache: Record<string, RoleOverrides> = {}
    for (const r of rows) {
      if (!cache[r.role]) cache[r.role] = {}
      const mod = r.module as ModuleId
      const ov: RoleOverride = {}
      if (r.actions !== null) {
        try { ov.actions = JSON.parse(r.actions) } catch { ov.actions = null }
      }
      if (r.dataScope !== null) ov.dataScope = r.dataScope as DataScope
      if (r.enabled !== null) ov.enabled = r.enabled
      cache[r.role][mod] = ov
    }
    setRoleOverridesCache(cache)
    roleOverridesLoaded = true
  } catch {
    // DB may not be ready; ignore
  }
}

/** Reset the role overrides cache (called when super admin saves role changes). */
export function resetRoleOverridesCache() {
  roleOverridesLoaded = false
  setRoleOverridesCache({})
}

/** Read the current user from the session cookie. Returns null if not authenticated. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  // Load role overrides once per request (affects canUser/requirePerm)
  await loadRoleOverridesOnce()

  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  const decoded = verifyToken(token)
  if (!decoded) return null

  const user = await db.user.findUnique({
    where: { id: decoded.uid },
    include: {
      teacherClasses: { select: { classId: true } },
      parentLinks: { select: { studentId: true } },
      permissions: true,
    },
  })
  if (!user || !user.active) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    employeeId: user.employeeId,
    studentId: user.studentId,
    teacherClassIds: user.teacherClasses.map((t) => t.classId),
    childrenStudentIds: user.parentLinks.map((p) => p.studentId),
    overrides: parseOverrides(user.permissions),
  }
}

/** Require an authenticated user with a specific permission (checks per-user overrides). Returns a guard result. */
export async function requirePerm(
  module: ModuleId,
  action: Action = 'view',
): Promise<{ ok: true; user: AuthUser } | { ok: false; res: NextResponse }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!canUser(user, module, action)) return { ok: false, res: NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 }) }
  return { ok: true, user }
}
