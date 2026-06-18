import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function GET() {
  const guard = await requirePerm('admissions', 'view')
  if (!guard.ok) return guard.res
  const list = await db.admissionEnquiry.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(list.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })))
}

export async function POST(req: NextRequest) {
  const guard = await requirePerm('admissions', 'create')
  if (!guard.ok) return guard.res
  const body = await req.json()
  const e = await db.admissionEnquiry.create({ data: {
    studentName: body.studentName, parentName: body.parentName, phone: body.phone,
    email: body.email || null, classApplied: body.classApplied, source: body.source || 'Website',
    status: 'Enquiry', message: body.message || null,
  }})
  return NextResponse.json({ ...e, createdAt: e.createdAt.toISOString() })
}
