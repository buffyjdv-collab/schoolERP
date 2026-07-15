import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { canUser } from '@/lib/rbac'

// Returns class-wise + section-wise attendance breakdown.
// Query params:
//   mode=day&date=2026-12-10   → attendance % for that specific day
//   mode=month&month=2026-12   → attendance % averaged across the whole month
//
// Response: [{ classId, className, rate, totalRecords, sections: [{ sectionId, sectionName, rate, studentCount, totalRecords }] }]
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canUser(user, 'attendance', 'view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode') || 'day'
  const dateStr = searchParams.get('date') || ''
  const monthStr = searchParams.get('month') || ''

  // Determine the date range
  let start: Date, end: Date
  if (mode === 'month' && monthStr) {
    const [year, month] = monthStr.split('-').map(Number)
    start = new Date(year, month - 1, 1); start.setHours(0, 0, 0, 0)
    end = new Date(year, month, 0); end.setHours(23, 59, 59, 999)
  } else {
    // day mode
    const d = new Date(dateStr || new Date().toISOString().slice(0, 10))
    start = new Date(d); start.setHours(0, 0, 0, 0)
    end = new Date(d); end.setHours(23, 59, 59, 999)
  }

  // Role scoping: teachers only see their classes
  const classFilter = user.role === 'teacher'
    ? { id: { in: user.teacherClassIds.length ? user.teacherClassIds : ['__none__'] } }
    : (user.role === 'student' || user.role === 'parent')
      ? { id: '__none__' } // students/parents don't use this endpoint
      : {}

  const classes = await db.class.findMany({
    where: classFilter,
    include: { sections: { include: { students: { select: { id: true } } } } },
    orderBy: { name: 'asc' },
  })

  const result = []
  for (const c of classes) {
    // All students in this class
    const classStudentIds = await db.student.findMany({ where: { classId: c.id }, select: { id: true, sectionId: true } })
    const classStudentIdList = classStudentIds.map(s => s.id)

    const classRecords = await db.attendance.findMany({
      where: { date: { gte: start, lte: end }, studentId: { in: classStudentIdList } },
      select: { status: true, studentId: true },
    })
    const classPresent = classRecords.filter(r => r.status === 'Present').length
    const classRate = classRecords.length ? Math.round((classPresent / classRecords.length) * 100) : 0

    const sections = []
    for (const sec of c.sections) {
      const secStudentIds = sec.students.map(s => s.id)
      if (secStudentIds.length === 0) {
        sections.push({ sectionId: sec.id, sectionName: sec.name, rate: 0, studentCount: 0, totalRecords: 0 })
        continue
      }
      const secRecords = classRecords.filter(r => secStudentIds.includes(r.studentId))
      const secPresent = secRecords.filter(r => r.status === 'Present').length
      const secRate = secRecords.length ? Math.round((secPresent / secRecords.length) * 100) : 0
      sections.push({
        sectionId: sec.id,
        sectionName: sec.name,
        rate: secRate,
        studentCount: secStudentIds.length,
        totalRecords: secRecords.length,
      })
    }

    result.push({
      classId: c.id,
      className: c.name,
      rate: classRate,
      totalRecords: classRecords.length,
      sections: sections.sort((a, b) => a.sectionName.localeCompare(b.sectionName)),
    })
  }

  return NextResponse.json(result)
}
