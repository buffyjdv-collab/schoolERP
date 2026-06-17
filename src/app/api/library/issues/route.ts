import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const issues = await db.libraryIssue.findMany({
    include: { book: true, student: true },
    orderBy: { issueDate: 'desc' },
    take: 200,
  })
  return NextResponse.json(issues.map(i => ({
    id: i.id, bookId: i.bookId, bookTitle: i.book.title, accessionNo: i.book.accessionNo,
    studentId: i.studentId, studentName: `${i.student.firstName} ${i.student.lastName}`, admissionNo: i.student.admissionNo,
    issueDate: i.issueDate.toISOString(), dueDate: i.dueDate.toISOString(),
    returnDate: i.returnDate?.toISOString() || null, fine: i.fine, status: i.status,
  })))
}

export async function POST(req: NextRequest) {
  const { bookId, studentId } = await req.json()
  const book = await db.book.findUnique({ where: { id: bookId } })
  if (!book || book.available <= 0) return NextResponse.json({ error: 'Book not available' }, { status: 400 })
  const issue = await db.libraryIssue.create({ data: {
    bookId, studentId, issueDate: new Date(),
    dueDate: new Date(Date.now() + 14 * 86400000), status: 'Issued',
  }})
  await db.book.update({ where: { id: bookId }, data: { available: { decrement: 1 } } })
  return NextResponse.json({ ...issue, issueDate: issue.issueDate.toISOString(), dueDate: issue.dueDate.toISOString() })
}
