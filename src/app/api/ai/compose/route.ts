import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(req: NextRequest) {
  const { channel, topic, audience } = await req.json()
  try {
    const zai = await ZAI.create()
    const prompt = `Compose a ${channel} message about "${topic}" for ${audience}. ${channel === 'SMS' ? 'Keep under 160 chars. No subject.' : channel === 'WhatsApp' ? 'Keep concise, friendly, may use 1-2 emojis. No subject.' : 'Include a subject line and a professional body.'} School: Vidyamatrix International School. Sign off as "School Office".`
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: 'You are a school communications writer. Output ONLY the message (and subject for email), ready to send.' },
        { role: 'user', content: prompt },
      ] as any,
      thinking: { type: 'disabled' },
    })
    const text = completion.choices[0]?.message?.content || ''
    let subject: string | undefined
    let message = text
    if (channel === 'Email') {
      const m = text.match(/^(?:Subject|subject)[:\-]?\s*(.+?)\n([\s\S]*)$/)
      if (m) { subject = m[1].trim(); message = m[2].trim() }
    }
    return NextResponse.json({ message, subject })
  } catch (e: any) {
    return NextResponse.json({ message: `Dear ${audience}, this is to inform you about ${topic}. Please contact the school office for details. — School Office`, subject: topic })
  }
}
