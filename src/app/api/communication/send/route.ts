import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { channel, recipient, subject, message, category } = await req.json()
  const n = await db.notification.create({ data: { channel, recipient, subject: subject || null, message, category: category || 'General', status: 'Sent' } })
  return NextResponse.json({ ...n, createdAt: n.createdAt.toISOString() })
}
