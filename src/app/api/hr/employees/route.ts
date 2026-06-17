import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function GET() {
  const guard = await requirePerm('hr', 'view')
  if (!guard.ok) return guard.res
  const list = await db.employee.findMany({ orderBy: { empCode: 'asc' } })
  return NextResponse.json(list.map(e => ({ ...e, fullName: `${e.firstName} ${e.lastName}`, dob: e.dob?.toISOString() || null, joiningDate: e.joiningDate.toISOString() })))
}
