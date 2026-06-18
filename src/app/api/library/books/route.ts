import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePerm } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const guard = await requirePerm('library', 'view')
  if (!guard.ok) return guard.res
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const books = await db.book.findMany({
    where: q ? { OR: [{ title: { contains: q } }, { author: { contains: q } }, { accessionNo: { contains: q } }, { isbn: { contains: q } }] } : {},
    orderBy: { title: 'asc' }, take: 200,
  })
  return NextResponse.json(books)
}

export async function POST(req: NextRequest) {
  const guard = await requirePerm('library', 'create')
  if (!guard.ok) return guard.res
  const body = await req.json()
  const book = await db.book.create({ data: {
    accessionNo: body.accessionNo, title: body.title, author: body.author, isbn: body.isbn || null,
    category: body.category, publisher: body.publisher || null, edition: body.edition || null,
    price: body.price || 0, totalCopies: body.totalCopies || 1, available: body.totalCopies || 1, rack: body.rack || null,
  }})
  return NextResponse.json(book)
}
