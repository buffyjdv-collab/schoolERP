import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [recentInvoices, recentLeaves, recentIssues, recentApps, recentEnquiries] = await Promise.all([
    db.feeInvoice.findMany({ take: 3, orderBy: { createdAt: 'desc' }, include: { student: true } }),
    db.leaveRequest.findMany({ take: 2, orderBy: { createdAt: 'desc' }, include: { employee: true } }),
    db.libraryIssue.findMany({ take: 2, orderBy: { createdAt: 'desc' }, include: { book: true, student: true } }),
    db.application.findMany({ take: 2, orderBy: { createdAt: 'desc' } }),
    db.admissionEnquiry.findMany({ take: 2, orderBy: { createdAt: 'desc' } }),
  ])
  const out: { id: string; type: string; text: string; time: string }[] = []
  for (const inv of recentInvoices) out.push({ id: inv.id, type: 'fee', text: `Fee invoice ${inv.invoiceNo} — ${inv.student.firstName} ${inv.student.lastName} (${inv.status})`, time: inv.createdAt.toISOString() })
  for (const lv of recentLeaves) out.push({ id: lv.id, type: 'leave', text: `${lv.employee.firstName} ${lv.employee.lastName} applied for ${lv.leaveType} leave`, time: lv.createdAt.toISOString() })
  for (const is of recentIssues) out.push({ id: is.id, type: 'library', text: `"${is.book.title}" issued to ${is.student.firstName} ${is.student.lastName}`, time: is.createdAt.toISOString() })
  for (const ap of recentApps) out.push({ id: ap.id, type: 'admission', text: `Application from ${ap.studentName} for ${ap.classApplied}`, time: ap.createdAt.toISOString() })
  for (const en of recentEnquiries) out.push({ id: en.id, type: 'enquiry', text: `Admission enquiry from ${en.studentName}`, time: en.createdAt.toISOString() })
  out.sort((a, b) => +new Date(b.time) - +new Date(a.time))
  return NextResponse.json(out.slice(0, 8))
}
