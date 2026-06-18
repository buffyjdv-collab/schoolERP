import { NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'super_admin' && user.role !== 'admin' && user.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden — staff only' }, { status: 403 })
  }
  const today = new Date(); today.setHours(0,0,0,0)
  const [present, absent, late, feeCollected, feePending, defaulters, pendingLeaves, lowAttClasses] = await Promise.all([
    db.attendance.count({ where: { date: today, status: 'Present' } }),
    db.attendance.count({ where: { date: today, status: 'Absent' } }),
    db.attendance.count({ where: { date: today, status: 'Late' } }),
    db.feeInvoice.aggregate({ _sum: { paidAmount: true } }),
    db.feeInvoice.aggregate({ where: { status: { in: ['Unpaid','Partial','Overdue'] } }, _sum: { amount: true } }),
    db.student.count({ where: { feeInvoices: { some: { status: { in: ['Overdue','Unpaid'] } } }, status: 'Active' } }),
    db.leaveRequest.count({ where: { status: 'Pending' } }),
    db.class.findMany({ select: { id: true, name: true } }),
  ])
  // find lowest attendance class
  const classRates: { name: string; rate: number }[] = []
  for (const c of lowAttClasses) {
    const p = await db.attendance.count({ where: { date: today, student: { classId: c.id }, status: 'Present' } })
    const t = await db.attendance.count({ where: { date: today, student: { classId: c.id } } })
    classRates.push({ name: c.name, rate: t ? Math.round(p/t*100) : 0 })
  }
  classRates.sort((a,b) => a.rate - b.rate)

  const summary = `TODAY: Present ${present}, Absent ${absent}, Late ${late}. Fee collected Rs.${(feeCollected._sum.paidAmount||0).toLocaleString('en-IN')}, pending Rs.${(feePending._sum.amount||0).toLocaleString('en-IN')}. Defaulters: ${defaulters}. Pending leaves: ${pendingLeaves}. Lowest attendance class: ${classRates[0]?.name} at ${classRates[0]?.rate}%.`

  try {
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: 'You are an ERP business analyst. Generate 4-5 short, actionable insights in bullet points based on the data. Highlight risks and recommended actions. Be specific with numbers.' },
        { role: 'user', content: summary },
      ] as any,
      thinking: { type: 'disabled' },
    })
    return NextResponse.json({ insights: completion.choices[0]?.message?.content || summary })
  } catch (e: any) {
    return NextResponse.json({ insights: `• Attendance today: ${present} present, ${absent} absent (${late} late).\n• Fee collection strong — Rs.${(feeCollected._sum.paidAmount||0).toLocaleString('en-IN')} collected; Rs.${(feePending._sum.amount||0).toLocaleString('en-IN')} pending.\n• ${defaulters} fee defaulters need follow-up.\n• ${pendingLeaves} leave requests await approval.\n• ${classRates[0]?.name} has lowest attendance (${classRates[0]?.rate}%) — investigate.` })
  }
}
