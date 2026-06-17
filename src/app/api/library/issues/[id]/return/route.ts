import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const issue = await db.libraryIssue.findUnique({ where: { id }, include: { book: true } })
  if (!issue) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const now = new Date()
  let fine = 0
  if (now > issue.dueDate) {
    const days = Math.ceil((now.getTime() - issue.dueDate.getTime()) / 86400000)
    fine = days * 10
  }
  const updated = await db.libraryIssue.update({ where: { id }, data: { returnDate: now, status: 'Returned', fine } })
  await db.book.update({ where: { id: issue.bookId }, data: { available: { increment: 1 } } })
  return NextResponse.json({ ...updated, issueDate: updated.issueDate.toISOString(), dueDate: updated.dueDate.toISOString(), returnDate: updated.returnDate?.toISOString() || null })
}
