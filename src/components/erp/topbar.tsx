'use client'

import { useStore } from '@/lib/store'
import { useTheme } from 'next-themes'
import { Bell, Moon, Search, Sun, Sparkles, Menu, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useState, useEffect } from 'react'

const moduleTitles: Record<string, string> = {
  dashboard: 'Dashboard & MIS',
  'ai-assistant': 'AI Assistant',
  admissions: 'Admission Management',
  students: 'Student Master',
  academics: 'Academic Setup',
  attendance: 'Attendance Management',
  exams: 'Examinations & Results',
  timetable: 'Timetable',
  fees: 'Fees & Accounts',
  hr: 'HR & Payroll',
  transport: 'Transport & Live GPS',
  library: 'Library Management',
  assets: 'Assets & Inventory',
  communication: 'Communication Center',
}

export function Topbar() {
  const { activeModule, setSearchQuery, setAiAssistantOpen } = useStore()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [now, setNow] = useState<string>('')

  const tick = () => setNow(new Date().toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }))

  useEffect(() => {
    // mount flag + clock; setState in interval callback (not synchronously in effect body)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    tick()
    const t = setInterval(tick, 30_000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="h-16 border-b bg-background/80 backdrop-blur-sm flex items-center gap-3 px-4 lg:px-6 shrink-0 z-20">
      <div className="min-w-0">
        <h1 className="text-base font-semibold leading-tight truncate">{moduleTitles[activeModule] || 'Vidyamatrix ERP'}</h1>
        <p className="text-[11px] text-muted-foreground hidden sm:block">{now}</p>
      </div>

      <div className="relative hidden md:flex items-center ml-4 flex-1 max-w-md">
        <Search className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search students, staff, invoices…"
          className="pl-9 h-9 bg-muted/50 border-transparent focus-visible:border-border"
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <kbd className="absolute right-2 text-[10px] text-muted-foreground border rounded px-1.5 py-0.5 hidden lg:block">⌘K</kbd>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-primary hidden sm:flex"
          onClick={() => setAiAssistantOpen(true)}
        >
          <Sparkles className="size-4" />
          <span className="hidden lg:inline">Ask AI</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          {mounted && theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9 relative">
              <Bell className="size-4" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive ring-2 ring-background" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications <Badge variant="secondary" className="text-[10px]">5 new</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {[
              { t: 'Fee defaulter alert', d: '12 students have overdue fees', c: 'text-amber-600' },
              { t: 'Leave request', d: 'Mrs. Priya Patel applied for sick leave', c: 'text-blue-600' },
              { t: 'Bus arrived', d: 'Route 3 reached school at 8:02 AM', c: 'text-emerald-600' },
              { t: 'Low stock', d: 'Lab chemicals below reorder level', c: 'text-rose-600' },
              { t: 'Exam result published', d: 'Mid Term results are ready to view', c: 'text-violet-600' },
            ].map((n, i) => (
              <DropdownMenuItem key={i} className="flex-col items-start gap-0.5 py-2">
                <span className={`text-xs font-medium ${n.c}`}>{n.t}</span>
                <span className="text-[11px] text-muted-foreground">{n.d}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 h-9 px-1.5 hover:bg-muted">
              <Avatar className="size-7">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">AD</AvatarFallback>
              </Avatar>
              <div className="hidden lg:block text-left leading-tight">
                <div className="text-xs font-medium">Admin Office</div>
                <div className="text-[10px] text-muted-foreground">Super Admin</div>
              </div>
              <ChevronDown className="size-3.5 text-muted-foreground hidden lg:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Help & Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
