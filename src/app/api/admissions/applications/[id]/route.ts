import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  // If approving, create student master record
  if (body.status === 'Approved') {
    const app = await db.application.findUnique({ where: { id } })
    if (app && !(await db.student.findFirst({ where: { email: app.email || undefined } }))) {
      const count = await db.student.count()
      const admissionNo = 'STU' + String(1001 + count).padStart(5, '0')
      const cls = await db.class.findFirst({ where: { name: app.classApplied } })
      await db.student.create({ data: {
        admissionNo, firstName: app.studentName.split(' ')[0], lastName: app.studentName.split(' ').slice(1).join(' ') || '-',
        dob: app.dob || new Date(2015, 0, 1), gender: app.gender || 'Male',
        address: app.address, phone: app.phone, email: app.email,
        fatherName: app.parentName, parentPhone: app.phone, parentEmail: app.email,
        previousSchool: app.previousSchool, classId: cls?.id, status: 'Active',
      }})
    }
  }
  const a = await db.application.update({ where: { id }, data: { status: body.status } })
  return NextResponse.json({ ...a, createdAt: a.createdAt.toISOString() })
}
