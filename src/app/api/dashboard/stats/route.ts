import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

function getToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export async function GET() {
  const today = getToday()
  const [
    totalStudents, totalEmployees, totalClasses, presentToday, absentToday,
    feeCollectedAgg, feePendingAgg, defaultersCount, newAdmissions, pendingLeaves,
    booksIssued, vehiclesActive,
  ] = await Promise.all([
    db.student.count({ where: { status: 'Active' } }),
    db.employee.count({ where: { status: 'Active' } }),
    db.class.count(),
    db.attendance.count({ where: { date: today, status: 'Present' } }),
    db.attendance.count({ where: { date: today, status: 'Absent' } }),
    db.feeInvoice.aggregate({ _sum: { paidAmount: true } }),
    db.feeInvoice.aggregate({ where: { status: { in: ['Unpaid', 'Partial', 'Overdue'] } }, _sum: { amount: true } }),
    db.student.count({
      where: {
        feeInvoices: { some: { status: { in: ['Overdue', 'Unpaid'] } } },
        status: 'Active',
      },
    }),
    db.student.count({ where: { admissionDate: { gte: new Date(new Date().getFullYear(), 0, 1) } } }),
    db.leaveRequest.count({ where: { status: 'Pending' } }),
    db.libraryIssue.count({ where: { status: 'Issued' } }),
    db.vehicle.count({ where: { status: 'Moving' } }),
  ])

  const todayCount = presentToday + absentToday
  const attendanceRate = todayCount > 0 ? Math.round((presentToday / todayCount) * 100) : 0

  return NextResponse.json({
    totalStudents, totalEmployees, totalClasses,
    presentToday, absentToday, attendanceRate,
    feeCollected: feeCollectedAgg._sum.paidAmount || 0,
    feePending: feePendingAgg._sum.amount || 0,
    feeDefaulters: defaultersCount,
    newAdmissions, pendingLeaves, booksIssued, vehiclesActive,
  })
}
