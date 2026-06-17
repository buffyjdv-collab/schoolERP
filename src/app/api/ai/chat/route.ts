import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'

async function buildContext(): Promise<string> {
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
  // class-wise attendance rates
  const cls = await db.class.findMany({ include: { _count: { select: { students: true } } } })
  const classAtt: string[] = []
  for (const c of cls) {
    const recs = await db.attendance.count({ where: { date: today, student: { classId: c.id }, status: 'Present' } })
    const total = await db.attendance.count({ where: { date: today, student: { classId: c.id } } })
    classAtt.push(`${c.name}: ${total ? Math.round(recs/total*100) : 0}% (${recs}/${total})`)
  }

  return `LIVE ERP CONTEXT (as of ${today.toDateString()}):
- Total active students: ${students}
- Total active employees: ${employees}
- Total classes: ${classes}
- Attendance today: ${present} present, ${absent} absent (rate: ${present+absent ? Math.round(present/(present+absent)*100) : 0}%)
- Fee collected (cumulative): Rs. ${(feeCollected._sum.paidAmount||0).toLocaleString('en-IN')}
- Fee pending: Rs. ${(feePending._sum.amount||0).toLocaleString('en-IN')}
- Fee defaulters (students with overdue/unpaid): ${defaulters}
- Pending leave requests: ${pendingLeaves}
- Books currently issued: ${booksIssued}
- Vehicles moving now: ${vehicles}
- Class-wise attendance today: ${classAtt.join(', ')}`
}

export async function POST(req: NextRequest) {
  const { message, history = [] } = await req.json()
  try {
    const context = await buildContext()
    const zai = await ZAI.create()
    const messages: { role: string; content: string }[] = [
      { role: 'assistant', content: `You are "Vidya", an AI assistant embedded in Vidyamatrix School ERP. You help administrators by answering questions about the school's operations using the LIVE data provided below. Be concise, use bullet points and numbers. When data supports it, cite the numbers. If asked to draft a message (SMS/Email/WhatsApp), produce a ready-to-send draft. Keep replies under 150 words unless asked for detail.\n\n${context}` },
      ...history.slice(-8),
      { role: 'user', content: message },
    ]
    const completion = await zai.chat.completions.create({
      messages: messages as any,
      thinking: { type: 'disabled' },
    })
    const reply = completion.choices[0]?.message?.content || 'I could not process that.'
    return NextResponse.json({ reply })
  } catch (e: any) {
    console.error('AI chat error:', e)
    return NextResponse.json({ reply: `I'm having trouble connecting to the AI service right now. Based on cached context, here's what I know: the school has an active student base with attendance and fee data available in the dashboard modules. (${e.message})` }, { status: 200 })
  }
}
