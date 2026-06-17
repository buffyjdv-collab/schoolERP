// Server-side auth: HMAC-signed session cookie + getCurrentUser().
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { NextResponse } from 'next/server'
import { db } from './db'
import { can } from './rbac'
import type { AuthUser, Role, ModuleId, Action } from './rbac'

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

/** Read the current user from the session cookie. Returns null if not authenticated. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  const decoded = verifyToken(token)
  if (!decoded) return null

  const user = await db.user.findUnique({
    where: { id: decoded.uid },
    include: { teacherClasses: { select: { classId: true } }, parentLinks: { select: { studentId: true } } },
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
  }
}

/** Require an authenticated user with a specific permission. Returns a guard result. */
export async function requirePerm(
  module: ModuleId,
  action: Action = 'view',
): Promise<{ ok: true; user: AuthUser } | { ok: false; res: NextResponse }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!can(user.role, module, action)) return { ok: false, res: NextResponse.json({ error: 'Forbidden — insufficient role' }, { status: 403 }) }
  return { ok: true, user }
}
