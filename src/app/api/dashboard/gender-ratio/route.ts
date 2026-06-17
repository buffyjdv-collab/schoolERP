import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const [male, female] = await Promise.all([
    db.student.count({ where: { gender: 'Male', status: 'Active' } }),
    db.student.count({ where: { gender: 'Female', status: 'Active' } }),
  ])
  return NextResponse.json([
    { label: 'Male', value: male },
    { label: 'Female', value: female },
  ])
}
