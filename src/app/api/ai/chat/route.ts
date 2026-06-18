import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import type { Role } from '@/lib/rbac'
import { ROLE_LABELS } from '@/lib/rbac'

async function buildStaffContext(): Promise<string> {
  const today = new Date(); today.setHours(0,0,0,0)
  const [students, employees, present, absent, feeCollected, feePending, defaulters, pendingLeaves, booksIssued, classes, vehicles] = await Promise.all([
    db.student.count({ where: { status: 'Active' } }),
    db.employee.count({ where: { status: 'Active' } }),
    db.attendance.count({ where: { date: today, status: 'Present' } }),
    db.attendance.count({ where: { date: today, status: 'Absent' } }),
    db.feeInvoice.aggregate({ _sum: { paidAmount: true } }),
    db.feeInvoice.aggregate({ where: { status: { in: ['Unpaid','Partial','Overdue'] } }, _sum: { amount: true } }),
    db.student.count({ where: { feeInvoices: { some: { status: { in: ['Overdue','Unpaid'] } } }, status: 'Active' } }),
    db.leaveRequest.count({ where: { status: 'Pending' } }),
    db.libraryIssue.count({ where: { status: 'Issued' } }),
    db.class.count(),
    db.vehicle.count({ where: { status: 'Moving' } }),
  ])
  const cls = await db.class.findMany()
  const classAtt: string[] = []
  for (const c of cls) {
    const recs = await db.attendance.count({ where: { date: today, student: { classId: c.id }, status: 'Present' } })
    const total = await db.attendance.count({ where: { date: today, student: { classId: c.id } } })
    classAtt.push(`${c.name}: ${total ? Math.round(recs/total*100) : 0}%`)
  }
  return `LIVE INSTITUTION-WIDE CONTEXT (as of ${today.toDateString()}):
- Active students: ${students}, active employees: ${employees}, classes: ${classes}
- Attendance today: ${present} present, ${absent} absent
- Fee collected: Rs. ${(feeCollected._sum.paidAmount||0).toLocaleString('en-IN')}; pending: Rs. ${(feePending._sum.amount||0).toLocaleString('en-IN')}
- Fee defaulters: ${defaulters}; pending leave requests: ${pendingLeaves}; books issued: ${booksIssued}; vehicles moving: ${vehicles}
- Class-wise attendance today: ${classAtt.join(', ')}`
}

async function buildScopedContext(role: Role, studentIds: string[]): Promise<string> {
  if (!studentIds.length) return 'No linked student records available.'
  const today = new Date(); today.setHours(0,0,0,0)
  const thirtyAgo = new Date(today.getTime() - 30*86400000)
  const students = await db.student.findMany({ where: { id: { in: studentIds } }, include: { class: true } })
  const parts: string[] = []
  for (const s of students) {
    const att = await db.attendance.findMany({ where: { studentId: s.id, date: { gte: thirtyAgo } }, select: { status: true } })
    const present = att.filter(a => a.status === 'Present').length
    const attPct = att.length ? Math.round((present/att.length)*100) : 100
    const fees = await db.feeInvoice.findMany({ where: { studentId: s.id }, select: { amount: true, paidAmount: true, status: true } })
    const total = fees.reduce((sum,f)=>sum+f.amount,0)
    const paid = fees.reduce((sum,f)=>sum+(f.paidAmount||0),0)
    const due = total - paid
    const marks = await db.examMark.findMany({ where: { studentId: s.id }, select: { subject: true, obtained: true, maxMarks: true, grade: true }, orderBy: { createdAt: 'desc' }, take: 8 })
    const todayAtt = await db.attendance.findFirst({ where: { studentId: s.id, date: today }, select: { status: true } })
    parts.push(`${s.firstName} ${s.lastName} (${s.admissionNo}, ${s.class?.name}):
  - Attendance (30d): ${attPct}% | Today: ${todayAtt?.status || 'NotMarked'}
  - Fees: total Rs.${total.toLocaleString('en-IN')}, paid Rs.${paid.toLocaleString('en-IN')}, due Rs.${due.toLocaleString('en-IN')}
  - Recent marks: ${marks.map(m=>`${m.subject} ${m.obtained}/${m.maxMarks} (${m.grade})`).join(', ') || 'none'}`)
  }
  return `LIVE PERSONAL CONTEXT (${ROLE_LABELS[role]} view):\n${parts.join('\n')}`
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, history = [] } = await req.json()
  try {
    let context: string
    let persona: string
    if (user.role === 'student' || user.role === 'parent') {
      const ids = user.role === 'student' ? (user.studentId ? [user.studentId] : []) : user.childrenStudentIds
      context = await buildScopedContext(user.role, ids)
      persona = user.role === 'student'
        ? `You are "Vidya", an AI assistant for a STUDENT using the school ERP. Answer ONLY about the student's OWN records (provided below). Do not reveal other students' data. Be encouraging and helpful for academic matters. Keep replies under 120 words.`
        : `You are "Vidya", an AI assistant for a PARENT using the school ERP. Answer about the parent's CHILDREN's records (provided below). Do not reveal other students' data. Be supportive and suggest actions (pay fees, follow up on attendance). Keep replies under 120 words.`
    } else if (user.role === 'teacher') {
      context = await buildStaffContext()
      persona = `You are "Vidya", an AI assistant for a TEACHER. Help with class management, attendance, marks entry, and student insights. You teach classes: ${user.teacherClassIds.length} class(es). Keep replies under 150 words.`
    } else {
      context = await buildStaffContext()
      persona = `You are "Vidya", an AI assistant for a ${ROLE_LABELS[user.role]} of a school ERP. Help with institution operations using the LIVE data below. Be concise, use bullet points and numbers. When asked to draft a message, produce a ready-to-send draft. Keep replies under 150 words unless asked for detail.`
    }

    const zai = await ZAI.create()
    const messages: { role: string; content: string }[] = [
      { role: 'assistant', content: `${persona}\n\n${context}` },
      ...history.slice(-8),
      { role: 'user', content: message },
    ]
    const completion = await zai.chat.completions.create({ messages: messages as any, thinking: { type: 'disabled' } })
    const reply = completion.choices[0]?.message?.content || 'I could not process that.'
    return NextResponse.json({ reply })
  } catch (e: any) {
    return NextResponse.json({ reply: `I'm having trouble connecting to the AI service. Please try again. (${e.message})` }, { status: 200 })
  }
}
