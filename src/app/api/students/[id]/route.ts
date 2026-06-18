import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/rbac'

async function canAccessStudent(studentId: string) {
  const user = await getCurrentUser()
  if (!user) return { ok: false as const, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!can(user.role, 'students', 'view')) return { ok: false as const, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  // Admin/super_admin: all. Teacher: only assigned classes. Student: only self. Parent: only children.
  if (user.role === 'super_admin' || user.role === 'admin') return { ok: true as const, user }
  if (user.role === 'student') {
    if (studentId !== user.studentId) return { ok: false as const, res: NextResponse.json({ error: 'Forbidden — not your record' }, { status: 403 }) }
    return { ok: true as const, user }
  }
  if (user.role === 'parent') {
    if (!user.childrenStudentIds.includes(studentId)) return { ok: false as const, res: NextResponse.json({ error: 'Forbidden — not your child' }, { status: 403 }) }
    return { ok: true as const, user }
  }
  if (user.role === 'teacher') {
    const s = await db.student.findUnique({ where: { id: studentId }, select: { classId: true } })
    if (!s || !user.teacherClassIds.includes(s.classId || '')) return { ok: false as const, res: NextResponse.json({ error: 'Forbidden — not in your class' }, { status: 403 }) }
    return { ok: true as const, user }
  }
  return { ok: false as const, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await canAccessStudent(id)
  if (!guard.ok) return guard.res
  const s = await db.student.findUnique({ where: { id }, include: { class: true, section: true } })
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const today = new Date(); today.setHours(0,0,0,0)
  const thirtyAgo = new Date(today.getTime() - 30*86400000)
  const att = await db.attendance.findMany({ where: { studentId: id, date: { gte: thirtyAgo } }, orderBy: { date: 'desc' } })
  const present = att.filter(a => a.status === 'Present').length
  return NextResponse.json({
    ...s, fullName: `${s.firstName} ${s.lastName}`, className: s.class?.name || '-', sectionName: s.section?.name || '-',
    attendancePercent: att.length ? Math.round((present/att.length)*100) : 100, recentAttendance: att.slice(0, 14),
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(user.role, 'students', 'edit')) return NextResponse.json({ error: 'Forbidden — your role cannot edit students' }, { status: 403 })
  const body = await req.json()
  const s = await db.student.update({ where: { id }, data: {
    firstName: body.firstName, lastName: body.lastName, gender: body.gender,
    bloodGroup: body.bloodGroup || null, address: body.address || null, phone: body.phone || null, email: body.email || null,
    fatherName: body.fatherName || null, motherName: body.motherName || null, guardianName: body.guardianName || null,
    parentPhone: body.parentPhone || null, parentEmail: body.parentEmail || null, parentOccupation: body.parentOccupation || null,
    classId: body.classId || null, sectionId: body.sectionId || null, rollNo: body.rollNo ?? null,
    medicalInfo: body.medicalInfo || null, transportRouteId: body.transportRouteId || null, status: body.status || 'Active',
  }})
  return NextResponse.json(s)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(user.role, 'students', 'delete')) return NextResponse.json({ error: 'Forbidden — your role cannot delete students' }, { status: 403 })
  // Soft-delete by setting status to Inactive (preserve referential integrity)
  const s = await db.student.update({ where: { id }, data: { status: 'Inactive' } })
  return NextResponse.json({ ok: true, id: s.id, status: s.status })
}
