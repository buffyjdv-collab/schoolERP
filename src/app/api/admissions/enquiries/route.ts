import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const list = await db.admissionEnquiry.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(list.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const e = await db.admissionEnquiry.create({ data: {
    studentName: body.studentName, parentName: body.parentName, phone: body.phone,
    email: body.email || null, classApplied: body.classApplied, source: body.source || 'Website',
    status: 'Enquiry', message: body.message || null,
  }})
  return NextResponse.json({ ...e, createdAt: e.createdAt.toISOString() })
}
