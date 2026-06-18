import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function GET() {
  const guard = await requirePerm('hr', 'view')
  if (!guard.ok) return guard.res
  const list = await db.employee.findMany({ orderBy: { empCode: 'asc' } })
  return NextResponse.json(list.map(e => ({ ...e, fullName: `${e.firstName} ${e.lastName}`, dob: e.dob?.toISOString() || null, joiningDate: e.joiningDate.toISOString() })))
}

export async function POST(req: NextRequest) {
  const guard = await requirePerm('hr', 'create')
  if (!guard.ok) return guard.res
  const body = await req.json()
  const count = await db.employee.count()
  const emp = await db.employee.create({ data: {
    empCode: body.empCode || `EMP${String(101 + count).padStart(4, '0')}`,
    firstName: body.firstName, lastName: body.lastName, designation: body.designation,
    department: body.department, gender: body.gender || 'Male',
    dob: body.dob ? new Date(body.dob) : null, phone: body.phone, email: body.email || null,
    address: body.address || null, joiningDate: body.joiningDate ? new Date(body.joiningDate) : new Date(),
    salary: body.salary || 0, status: 'Active',
  }})
  return NextResponse.json(emp)
}
