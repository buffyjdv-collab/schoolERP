import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const books = await db.book.findMany({
    where: q ? { OR: [{ title: { contains: q } }, { author: { contains: q } }, { accessionNo: { contains: q } }, { isbn: { contains: q } }] } : {},
    orderBy: { title: 'asc' },
    take: 200,
  })
  return NextResponse.json(books)
}
