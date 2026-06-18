import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

// Assign a route (and optionally bus) to a student
export async function POST(req: NextRequest) {
  const guard = await requirePerm('students', 'edit')
  if (!guard.ok) return guard.res
  const { studentId, routeId } = await req.json()
  const student = await db.student.findUnique({ where: { id: studentId } })
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  let routeName: string | null = null
  if (routeId) {
    const route = await db.route.findUnique({ where: { id: routeId } })
    if (!route) return NextResponse.json({ error: 'Route not found' }, { status: 404 })
    routeName = route.name
  }
  const updated = await db.student.update({ where: { id: studentId }, data: { routeId: routeId || null, transportRouteId: routeName } })
  return NextResponse.json({ ok: true, studentId: updated.id, routeId: updated.routeId, routeName: updated.transportRouteId })
}
