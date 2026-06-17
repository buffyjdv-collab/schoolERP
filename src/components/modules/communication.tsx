'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Notification } from '@/lib/types'
import { StatCard, SectionHeader, StatusBadge, EmptyState } from '@/components/erp/primitives'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  MessageSquare, Mail, Smartphone, Bell, Send, Sparkles, AlertTriangle,
  Inbox, Megaphone, Search, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

const CHANNELS = [
  { key: 'SMS', label: 'SMS', icon: Smartphone, accent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { key: 'Email', label: 'Email', icon: Mail, accent: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  { key: 'WhatsApp', label: 'WhatsApp', icon: MessageSquare, accent: 'bg-teal-500/10 text-teal-600 dark:text-teal-400' },
  { key: 'Push', label: 'Push', icon: Bell, accent: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
] as const

const CATEGORIES = ['Attendance', 'Fees', 'Exam', 'Transport', 'General'] as const

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function channelIcon(channel: string) {
  const c = CHANNELS.find((x) => x.key === channel)
  return c?.icon || Bell
}

function channelAccent(channel: string) {
  return CHANNELS.find((x) => x.key === channel)?.accent || 'bg-muted text-muted-foreground'
}

// ============ Compose Card ============
function ComposeCard() {
  const qc = useQueryClient()
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]['key']>('SMS')
  const [recipient, setRecipient] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('General')

  const sendMut = useMutation({
    mutationFn: (data: { channel: string; recipient: string; subject?: string; message: string; category: string }) => api.communication.send(data),
    onSuccess: (_d, vars) => {
      toast.success(`Message sent via ${vars.channel}`, { description: `Delivered to ${vars.recipient}` })
      qc.invalidateQueries({ queryKey: ['communication', 'list'] })
      setMessage('')
      setSubject('')
      setRecipient('')
      setTopic('')
    },
    onError: () => toast.error('Failed to send message'),
  })

  const aiMut = useMutation({
    mutationFn: (data: { channel: string; topic: string; audience: string }) => api.ai.composeMessage(data),
    onSuccess: (data) => {
      setMessage(data.message)
      if (data.subject && channel === 'Email') setSubject(data.subject)
      toast.success('AI draft ready', { description: 'Review and edit before sending.' })
    },
    onError: () => toast.error('AI compose failed', { description: 'Please try again or write manually.' }),
  })

  const ChannelIcon = channelIcon(channel)
  const isEmail = channel === 'Email'
  const valid = recipient.trim().length > 0 && message.trim().length > 0 && (!isEmail || subject.trim().length > 0)
  const aiReady = topic.trim().length > 0 && audience.trim().length > 0

  return (
    <Card className="lg:sticky lg:top-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Megaphone className="size-4 text-primary" /> Compose Message</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Send a message via SMS, Email, WhatsApp or Push notification.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Channel selector */}
        <div className="space-y-1.5">
          <Label className="text-xs">Channel</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {CHANNELS.map((c) => {
              const Icon = c.icon
              const active = channel === c.key
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setChannel(c.key)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2.5 text-[11px] font-medium transition-all hover:shadow-sm ${active ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-accent'}`}
                >
                  <Icon className={`size-4 ${active ? 'text-primary' : ''}`} />
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Recipient */}
        <div className="space-y-1.5">
          <Label htmlFor="recipient" className="text-xs">Recipient {isEmail ? '(email)' : '(phone)'}</Label>
          <Input
            id="recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder={isEmail ? 'parent@example.com' : '+91 98765 43210'}
          />
        </div>

        {/* Subject — only for email */}
        {isEmail && (
          <div className="space-y-1.5">
            <Label htmlFor="subject" className="text-xs">Subject</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" />
          </div>
        )}

        {/* AI Compose */}
        <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-primary grid place-items-center shrink-0">
              <Sparkles className="size-3.5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs font-semibold">AI Compose</p>
              <p className="text-[11px] text-muted-foreground">Draft a polished message in one click.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (e.g. PTM on Saturday)" className="text-xs h-9" />
            <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Audience (e.g. Parents of Class 5)" className="text-xs h-9" />
          </div>
          <Button
            size="sm"
            variant="default"
            disabled={!aiReady || aiMut.isPending}
            onClick={() => aiMut.mutate({ channel, topic, audience })}
            className="w-full gap-1.5"
          >
            {aiMut.isPending ? <RefreshCw className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {aiMut.isPending ? 'Composing…' : 'AI Compose Message'}
          </Button>
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="message" className="text-xs">Message</Label>
            <span className="text-[10px] text-muted-foreground tabular-nums">{message.length} chars</span>
          </div>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message or use AI Compose above…"
            rows={5}
          />
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label className="text-xs">Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as (typeof CATEGORIES)[number])}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Button
          className="w-full gap-1.5"
          disabled={!valid || sendMut.isPending}
          onClick={() => sendMut.mutate({ channel, recipient, subject: isEmail ? subject : undefined, message, category })}
        >
          {sendMut.isPending ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}
          Send {channel}
        </Button>
      </CardContent>
    </Card>
  )
}

// ============ History Card ============
function HistoryCard({ notifications }: { notifications: Notification[] }) {
  const [channelFilter, setChannelFilter] = useState('all')
  const [q, setQ] = useState('')

  const filtered = notifications.filter((n) => {
    if (channelFilter !== 'all' && n.channel !== channelFilter) return false
    if (!q) return true
    const s = q.toLowerCase()
    return n.recipient.toLowerCase().includes(s) || (n.subject || '').toLowerCase().includes(s) || n.message.toLowerCase().includes(s)
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><Inbox className="size-4 text-primary" /> Message History</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{filtered.length} of {notifications.length} messages</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                {CHANNELS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative w-full sm:w-56">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-9" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {filtered.length === 0 ? (
          <div className="px-6 pb-4"><EmptyState icon={Inbox} title="No messages" description={q || channelFilter !== 'all' ? 'Try a different filter.' : 'Sent messages will appear here.'} /></div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-32">Channel</TableHead>
                  <TableHead className="min-w-[180px]">Recipient & Content</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((n) => {
                  const Icon = channelIcon(n.channel)
                  return (
                    <TableRow key={n.id} className="hover:bg-accent/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`size-7 rounded-lg grid place-items-center shrink-0 ${channelAccent(n.channel)}`}>
                            <Icon className="size-3.5" />
                          </div>
                          <span className="text-xs font-medium">{n.channel}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">{n.recipient}</div>
                        {n.subject ? (
                          <div className="text-sm font-medium truncate max-w-[280px]">{n.subject}</div>
                        ) : null}
                        <div className={`text-xs text-muted-foreground ${n.subject ? '' : 'font-medium text-foreground/80'} truncate max-w-[320px]`}>{n.message}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell"><Badge variant="outline" className="text-[10px]">{n.category}</Badge></TableCell>
                      <TableCell><StatusBadge status={n.status} /></TableCell>
                      <TableCell className="text-right hidden sm:table-cell text-xs text-muted-foreground">{fmtDateTime(n.createdAt)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============ Main module ============
export function CommunicationModule() {
  const { data: notifications, isLoading } = useQuery({ queryKey: ['communication', 'list'], queryFn: api.communication.list })

  const sms = notifications?.filter((n) => n.channel === 'SMS' && n.status === 'Sent').length ?? 0
  const email = notifications?.filter((n) => n.channel === 'Email' && n.status === 'Sent').length ?? 0
  const whatsapp = notifications?.filter((n) => n.channel === 'WhatsApp' && n.status === 'Sent').length ?? 0
  const failed = notifications?.filter((n) => n.status === 'Failed').length ?? 0

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Communication Center"
        description="Send and track SMS, Email, WhatsApp and Push notifications to parents and staff."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="SMS Sent" value={sms} sub="Delivered" icon={Smartphone} accent="emerald" loading={isLoading} />
        <StatCard label="Email Sent" value={email} sub="Delivered" icon={Mail} accent="sky" loading={isLoading} />
        <StatCard label="WhatsApp Sent" value={whatsapp} sub="Delivered" icon={MessageSquare} accent="primary" loading={isLoading} />
        <StatCard label="Failed" value={failed} sub="Need retry" icon={AlertTriangle} accent="rose" loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-1"><ComposeCard /></div>
        <div className="lg:col-span-2">
          {isLoading ? (
            <Card><CardContent className="p-6 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</CardContent></Card>
          ) : (
            <HistoryCard notifications={notifications || []} />
          )}
        </div>
      </div>
    </div>
  )
}
