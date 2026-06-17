import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import { createSessionToken, SESSION_COOKIE } from '@/lib/auth'
import type { Role } from '@/lib/rbac'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { teacherClasses: { select: { classId: true } }, parentLinks: { select: { studentId: true } } },
  })
  if (!user || !user.active) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  if (!verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  await db.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } })

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
  })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })
  return res
}
