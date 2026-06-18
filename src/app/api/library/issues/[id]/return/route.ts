import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/rbac'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(user.role, 'library', 'return')) return NextResponse.json({ error: 'Forbidden — your role cannot return books' }, { status: 403 })

  const issue = await db.libraryIssue.findUnique({ where: { id }, include: { book: true } })
  if (!issue) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Students/parents can only return their own/children's books
  if (user.role === 'student' && issue.studentId !== user.studentId) {
    return NextResponse.json({ error: 'Forbidden — not your book' }, { status: 403 })
  }
  if (user.role === 'parent' && !user.childrenStudentIds.includes(issue.studentId)) {
    return NextResponse.json({ error: 'Forbidden — not your child\'s book' }, { status: 403 })
  }

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
