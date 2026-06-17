'use client'

import { useStore } from '@/lib/store'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sparkles, Send, Loader2, Bot, User } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'

interface Msg { role: 'user' | 'assistant'; content: string }

const suggestions = [
  'How many students are absent today?',
  'Show fee defaulters summary',
  'Which class has the lowest attendance?',
  'Generate a parent message about fee dues',
]

export function AiAssistantDrawer() {
  const { aiAssistantOpen, setAiAssistantOpen } = useStore()
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: "Hello! I'm Vidya, your AI ERP assistant. I can analyze attendance, fees, admissions, HR data and help you draft messages. Try asking me something." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')
    const next = [...messages, { role: 'user' as const, content }]
    setMessages(next)
    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, history: next.slice(-8).map(m => ({ role: m.role, content: m.content })) }),
      })
      if (!res.ok) throw new Error('AI request failed')
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.reply }])
    } catch (e: any) {
      toast.error('AI assistant unavailable: ' + e.message)
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, I had trouble processing that. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={aiAssistantOpen} onOpenChange={setAiAssistantOpen}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-transparent">
          <SheetTitle className="flex items-center gap-2 text-base">
            <div className="size-7 rounded-lg bg-primary grid place-items-center">
              <Sparkles className="size-4 text-primary-foreground" />
            </div>
            Vidya · AI Assistant
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1" ref={scrollRef as any}>
          <div className="p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`size-7 rounded-lg grid place-items-center shrink-0 ${m.role === 'user' ? 'bg-muted' : 'bg-primary'}`}>
                  {m.role === 'user' ? <User className="size-4" /> : <Bot className="size-4 text-primary-foreground" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5">
                <div className="size-7 rounded-lg bg-primary grid place-items-center shrink-0">
                  <Bot className="size-4 text-primary-foreground" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            {messages.length <= 1 && (
              <div className="space-y-1.5 pt-2">
                <p className="text-[11px] text-muted-foreground font-medium px-1">Try asking</p>
                {suggestions.map(s => (
                  <button key={s} onClick={() => send(s)} className="w-full text-left text-xs px-3 py-2 rounded-lg border hover:bg-muted transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-3 border-t">
          <form onSubmit={(e) => { e.preventDefault(); send() }} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about students, fees, attendance…"
              className="h-10"
              disabled={loading}
            />
            <Button type="submit" size="icon" className="size-10 shrink-0" disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
