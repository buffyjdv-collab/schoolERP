import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const classes = await db.class.findMany({ include: { _count: { select: { students: true } } }, orderBy: { name: 'asc' } })
  return NextResponse.json(classes.map(c => ({ label: c.name, value: c._count.students })))
}
