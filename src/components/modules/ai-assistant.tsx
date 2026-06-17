'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sparkles, Send, Loader2, Bot, User, TrendingUp, AlertTriangle, Lightbulb, BarChart3, Wand2, Copy } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface Msg { role: 'user' | 'assistant'; content: string }

const suggestions = [
  { icon: BarChart3, text: 'Give me a summary of today\'s attendance and flag concerning classes', color: 'text-emerald-600 bg-emerald-500/10' },
  { icon: AlertTriangle, text: 'List all fee defaulters and suggest a recovery plan', color: 'text-amber-600 bg-amber-500/10' },
  { icon: TrendingUp, text: 'Which class performed best in the mid-term exam?', color: 'text-violet-600 bg-violet-500/10' },
  { icon: Lightbulb, text: 'Draft an SMS to parents about upcoming parent-teacher meeting', color: 'text-sky-600 bg-sky-500/10' },
]

export function AiAssistantModule() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: "Hello! I'm **Vidya**, your AI ERP assistant. I have live access to your school's data — attendance, fees, admissions, HR, transport, library and more.\n\nAsk me anything, or try one of the suggestions below to get started." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data: insights } = useQuery({ queryKey: ['ai-insights'], queryFn: api.ai.insights })

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
      const data = await api.ai.chat(content, next.slice(-8).map(m => ({ role: m.role, content: m.content })))
      setMessages(m => [...m, { role: 'assistant', content: data.reply }])
    } catch (e: any) {
      toast.error('AI unavailable: ' + e.message)
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, I had trouble processing that. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-[calc(100vh-9rem)]">
      {/* Chat */}
      <Card className="lg:col-span-2 flex flex-col">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary grid place-items-center"><Sparkles className="size-4 text-primary-foreground" /></div>
            Vidya · AI Assistant
            <span className="ml-auto text-[11px] font-normal text-muted-foreground flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> Connected to live ERP data</span>
          </CardTitle>
        </CardHeader>
        <ScrollArea className="flex-1" ref={scrollRef as any}>
          <div className="p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`size-8 rounded-lg grid place-items-center shrink-0 ${m.role === 'user' ? 'bg-muted' : 'bg-primary'}`}>
                  {m.role === 'user' ? <User className="size-4" /> : <Bot className="size-4 text-primary-foreground" />}
                </div>
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  {m.role === 'assistant' && i > 0 && (
                    <button onClick={() => { navigator.clipboard.writeText(m.content); toast.success('Copied') }} className="mt-1.5 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"><Copy className="size-2.5" /> Copy</button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5">
                <div className="size-8 rounded-lg bg-primary grid place-items-center shrink-0"><Bot className="size-4 text-primary-foreground" /></div>
                <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-3 border-t">
          <form onSubmit={(e) => { e.preventDefault(); send() }} className="flex gap-2">
            <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about students, fees, attendance, HR…" className="h-10" disabled={loading} />
            <Button type="submit" size="icon" className="size-10 shrink-0" disabled={loading || !input.trim()}>{loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}</Button>
          </form>
        </div>
      </Card>

      {/* Sidebar: insights + suggestions */}
      <div className="space-y-4 overflow-y-auto scroll-thin">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Wand2 className="size-4 text-primary" /> AI-Generated Insights</CardTitle></CardHeader>
          <CardContent className="pt-0">
            {insights ? <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{insights.insights}</div> : <div className="space-y-2">{Array.from({length:5}).map((_,i)=><div key={i} className="h-3 bg-muted rounded animate-pulse" style={{width:`${80-i*10}%`}} />)}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Lightbulb className="size-4 text-primary" /> Try Asking</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-2">
            {suggestions.map(s => (
              <button key={s.text} onClick={() => send(s.text)} className="w-full text-left p-2.5 rounded-lg border hover:bg-muted transition-colors flex items-start gap-2.5">
                <div className={`size-7 rounded-md grid place-items-center shrink-0 ${s.color}`}><s.icon className="size-3.5" /></div>
                <span className="text-xs leading-snug pt-1">{s.text}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><Sparkles className="size-4 text-primary" /><span className="text-sm font-semibold">AI Capabilities</span></div>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>• Natural-language analytics across all modules</li>
              <li>• Draft SMS/Email/WhatsApp messages</li>
              <li>• Identify at-risk students & defaulters</li>
              <li>• Generate MIS report summaries</li>
              <li>• Predict attendance & fee trends</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
