import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const list = await db.employee.findMany({ orderBy: { empCode: 'asc' } })
  return NextResponse.json(list.map(e => ({ ...e, fullName: `${e.firstName} ${e.lastName}`, dob: e.dob?.toISOString() || null, joiningDate: e.joiningDate.toISOString() })))
}
