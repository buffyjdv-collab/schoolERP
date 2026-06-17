import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { visibleStudentIds } from '@/lib/rbac'

// Scoped dashboard stats for the current user (student/parent/teacher).
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Staff → full stats (admin/teacher use the main stats endpoint)
  if (user.role === 'super_admin' || user.role === 'admin') {
    return NextResponse.json({ role: user.role, redirect: 'stats' })
  }

  const ids = visibleStudentIds(user)
  if (!ids.length || ids === 'all') {
    return NextResponse.json({ role: user.role, students: [] })
  }

  const students = await db.student.findMany({
    where: { id: { in: ids } },
    include: { class: true, section: true },
  })

  // For each student: attendance %, fee summary, recent marks
  const today = new Date(); today.setHours(0,0,0,0)
  const thirtyAgo = new Date(today.getTime() - 30*86400000)

  const enriched = await Promise.all(students.map(async (s) => {
    const att = await db.attendance.findMany({ where: { studentId: s.id, date: { gte: thirtyAgo } }, select: { status: true } })
    const present = att.filter(a => a.status === 'Present').length
    const attendancePercent = att.length ? Math.round((present/att.length)*100) : 100

    const fees = await db.feeInvoice.findMany({ where: { studentId: s.id }, select: { amount: true, paidAmount: true, status: true } })
    const totalFees = fees.reduce((sum, f) => sum + f.amount, 0)
    const paidFees = fees.reduce((sum, f) => sum + (f.paidAmount||0), 0)
    const dueFees = totalFees - paidFees
    const feeStatus = fees.some(f => f.status === 'Overdue' || f.status === 'Unpaid') ? 'Overdue' : fees.some(f => f.status === 'Partial') ? 'Partial' : 'Clear'

    const marks = await db.examMark.findMany({ where: { studentId: s.id }, select: { subject: true, obtained: true, maxMarks: true, grade: true }, take: 12, orderBy: { createdAt: 'desc' } })
    const avgPct = marks.length ? Math.round(marks.reduce((sum, m) => sum + ((m.obtained||0)/m.maxMarks*100), 0) / marks.length) : 0

    const todayAtt = await db.attendance.findFirst({ where: { studentId: s.id, date: today }, select: { status: true } })
    const transportRoute = s.transportRouteId

    return {
      id: s.id, name: `${s.firstName} ${s.lastName}`, admissionNo: s.admissionNo,
      className: s.class?.name || '-', sectionName: s.section?.name || '-', rollNo: s.rollNo,
      photo: s.photo, attendancePercent, feeStatus, totalFees, paidFees, dueFees, avgPct,
      todayStatus: todayAtt?.status || 'NotMarked', transportRoute,
      recentMarks: marks.map(m => ({ subject: m.subject, obtained: m.obtained, maxMarks: m.maxMarks, grade: m.grade, pct: Math.round((m.obtained||0)/m.maxMarks*100) })),
    }
  }))

  // Teacher-specific: their classes
  let teacherClasses: any[] = []
  if (user.role === 'teacher' && user.teacherClassIds.length) {
    teacherClasses = await db.class.findMany({
      where: { id: { in: user.teacherClassIds } },
      include: { _count: { select: { students: true } }, sections: true },
    })
  }

  return NextResponse.json({ role: user.role, students: enriched, teacherClasses })
}
