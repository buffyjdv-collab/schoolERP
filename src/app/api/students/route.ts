import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { canUser } from "@/lib/rbac"

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canUser(user, 'students', 'view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const classId = searchParams.get('classId') || undefined
  const status = searchParams.get('status') || undefined

  // Build role-scoped filter
  let scopeWhere: any = {}
  if (user.role === 'student') {
    scopeWhere = { id: user.studentId || '__none__' }
  } else if (user.role === 'parent') {
    scopeWhere = { id: { in: user.childrenStudentIds.length ? user.childrenStudentIds : ['__none__'] } }
  } else if (user.role === 'teacher') {
    scopeWhere = { classId: { in: user.teacherClassIds.length ? user.teacherClassIds : ['__none__'] } }
  }

  const students = await db.student.findMany({
    where: {
      AND: [
        scopeWhere,
        q ? { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { admissionNo: { contains: q } }, { parentPhone: { contains: q } }] } : {},
        classId ? { classId } : {},
        status ? { status } : {},
      ],
    },
    include: { class: true, section: true },
    orderBy: { admissionNo: 'asc' },
    take: 500,
  })

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const thirtyAgo = new Date(today.getTime() - 30 * 86400000)
  const result = await Promise.all(students.map(async (s) => {
    const att = await db.attendance.findMany({ where: { studentId: s.id, date: { gte: thirtyAgo } }, select: { status: true } })
    const present = att.filter(a => a.status === 'Present').length
    const rate = att.length ? Math.round((present / att.length) * 100) : 100
    const fees = await db.feeInvoice.findMany({ where: { studentId: s.id }, select: { status: true } })
    const feeStatus = fees.some(f => f.status === 'Overdue' || f.status === 'Unpaid') ? 'Due' : fees.some(f => f.status === 'Partial') ? 'Partial' : 'Clear'
    return { ...s, fullName: `${s.firstName} ${s.lastName}`, className: s.class?.name || '-', sectionName: s.section?.name || '-', attendancePercent: rate, feeStatus }
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canUser(user, 'students', 'create')) return NextResponse.json({ error: 'Forbidden — your role cannot create students' }, { status: 403 })

  const body = await req.json()
  const count = await db.student.count()
  const admissionNo = 'STU' + String(1001 + count).padStart(5, '0')
  const s = await db.student.create({
    data: {
      admissionNo, firstName: body.firstName, lastName: body.lastName, dob: new Date(body.dob),
      gender: body.gender, bloodGroup: body.bloodGroup || null, address: body.address || null,
      phone: body.phone || null, email: body.email || null, fatherName: body.fatherName || null,
      motherName: body.motherName || null, guardianName: body.guardianName || null,
      parentPhone: body.parentPhone || null, parentEmail: body.parentEmail || null,
      parentOccupation: body.parentOccupation || null, classId: body.classId || null,
      sectionId: body.sectionId || null, previousSchool: body.previousSchool || null,
      medicalInfo: body.medicalInfo || null, status: 'Active',
    },
  })
  return NextResponse.json(s)
}
