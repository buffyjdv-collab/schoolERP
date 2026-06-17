'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar,
} from 'recharts'
import {
  CalendarCheck, Wallet, GraduationCap, Bus, BookOpen, TrendingUp, Clock, MapPin,
  UserCheck, UserX, AlertTriangle, ChevronRight, Calendar, Award, Users, Sparkles, ClipboardList,
} from 'lucide-react'
import { StatCard, StatusBadge } from '@/components/erp/primitives'
import { ROLE_LABELS } from '@/lib/rbac'
import { useState } from 'react'
import { toast } from 'sonner'

function fmtINR(n: number) {
  if (n >= 100000) return `₹${(n/100000).toFixed(2)} L`
  if (n >= 1000) return `₹${(n/1000).toFixed(1)}K`
  return `₹${n.toLocaleString('en-IN')}`
}

interface ScopedStudent {
  id: string; name: string; admissionNo: string; className: string; sectionName: string; rollNo?: number
  attendancePercent: number; feeStatus: string; totalFees: number; paidFees: number; dueFees: number
  avgPct: number; todayStatus: string; transportRoute?: string | null
  recentMarks: { subject: string; obtained: number; maxMarks: number; grade: string; pct: number }[]
}

// ============ STUDENT DASHBOARD ============
export function StudentDashboard() {
  const { user, setModule, setAiAssistantOpen } = useStore()
  const { data, isLoading } = useQuery({ queryKey: ['me', user?.id], queryFn: api.dashboard.me, enabled: !!user })
  const me: ScopedStudent | undefined = data?.students?.[0]

  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-28" />)}</div>
  if (!me) return <Card><CardContent className="p-8 text-center text-muted-foreground">No student record linked to your account.</CardContent></Card>

  const radarData = me.recentMarks.slice(0,6).map(m => ({ subject: m.subject.slice(0,4), marks: m.pct }))

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white p-6">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="relative flex items-center gap-4">
          <Avatar className="size-14 border-2 border-white/30"><AvatarFallback className="bg-white/20 text-white">{me.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</AvatarFallback></Avatar>
          <div>
            <p className="text-xs uppercase tracking-wider opacity-90">Student Portal · {ROLE_LABELS[user!.role]}</p>
            <h2 className="text-2xl font-bold">Hello, {me.name} 👋</h2>
            <p className="text-sm opacity-90">{me.className} · Section {me.sectionName} · Roll #{me.rollNo} · {me.admissionNo}</p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs opacity-90">Today's Status</div>
            <div className="text-lg font-semibold capitalize">{me.todayStatus}</div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="My Attendance" value={`${me.attendancePercent}%`} sub="Last 30 days" icon={CalendarCheck} accent="emerald" />
        <StatCard label="Avg Score" value={`${me.avgPct}%`} sub={`${me.recentMarks.length} subjects`} icon={Award} accent="violet" />
        <StatCard label="Fees Paid" value={fmtINR(me.paidFees)} sub={`of ${fmtINR(me.totalFees)}`} icon={Wallet} accent="primary" />
        <StatCard label="Fee Due" value={fmtINR(me.dueFees)} sub={me.feeStatus === 'Clear' ? 'All clear' : 'Pending'} icon={AlertTriangle} accent={me.dueFees > 0 ? 'rose' : 'emerald'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent marks */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><GraduationCap className="size-4 text-primary" /> Recent Exam Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-64 overflow-y-auto scroll-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card"><tr className="border-b"><th className="text-left p-2 text-xs font-semibold">Subject</th><th className="text-right p-2 text-xs font-semibold">Obtained</th><th className="text-right p-2 text-xs font-semibold">Max</th><th className="text-center p-2 text-xs font-semibold">Grade</th></tr></thead>
                <tbody>
                  {me.recentMarks.map((m, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-2">{m.subject}</td>
                      <td className="p-2 text-right tabular-nums">{m.obtained}</td>
                      <td className="p-2 text-right tabular-nums text-muted-foreground">{m.maxMarks}</td>
                      <td className="p-2 text-center"><Badge variant={m.pct >= 80 ? 'default' : m.pct >= 60 ? 'secondary' : 'destructive'} className="text-[10px]">{m.grade}</Badge></td>
                    </tr>
                  ))}
                  {!me.recentMarks.length && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground text-xs">No marks published yet</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Subject radar */}
        {radarData.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Subject Strength</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <PolarRadiusAxis domain={[0,100]} tick={{ fontSize: 9 }} stroke="var(--muted-foreground)" />
                  <Radar dataKey="marks" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'My Attendance', icon: CalendarCheck, m: 'attendance' as const, accent: 'text-emerald-600 bg-emerald-500/10' },
          { label: 'My Fees', icon: Wallet, m: 'fees' as const, accent: 'text-amber-600 bg-amber-500/10' },
          { label: 'My Results', icon: GraduationCap, m: 'exams' as const, accent: 'text-violet-600 bg-violet-500/10' },
          { label: 'My Timetable', icon: Clock, m: 'timetable' as const, accent: 'text-sky-600 bg-sky-500/10' },
        ].map(q => (
          <button key={q.label} onClick={() => setModule(q.m)} className="flex items-center gap-3 p-3 rounded-xl border hover:border-primary hover:bg-primary/5 transition-colors text-left">
            <div className={`size-9 rounded-lg grid place-items-center ${q.accent}`}><q.icon className="size-4" /></div>
            <span className="text-sm font-medium">{q.label}</span>
            <ChevronRight className="size-4 ml-auto text-muted-foreground" />
          </button>
        ))}
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-center gap-3">
          <Sparkles className="size-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">Need help with your studies?</p>
            <p className="text-xs text-muted-foreground">Ask Vidya AI about your performance, upcoming exams, or study tips.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAiAssistantOpen(true)}>Ask AI</Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ============ PARENT DASHBOARD ============
export function ParentDashboard() {
  const { user, setModule } = useStore()
  const { data, isLoading } = useQuery({ queryKey: ['me', user?.id], queryFn: api.dashboard.me, enabled: !!user })
  const children: ScopedStudent[] = data?.students || []
  const [selected, setSelected] = useState(0)
  const child = children[selected]

  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-28" />)}</div>
  if (!children.length) return <Card><CardContent className="p-8 text-center text-muted-foreground">No children linked to your account.</CardContent></Card>

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white p-6">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="relative">
          <p className="text-xs uppercase tracking-wider opacity-90">Parent Portal · {ROLE_LABELS[user!.role]}</p>
          <h2 className="text-2xl font-bold">Welcome, {user?.name}</h2>
          <p className="text-sm opacity-90">Monitoring {children.length} {children.length === 1 ? 'child' : 'children'} · {children.map(c => c.name).join(', ')}</p>
        </div>
      </div>

      {/* Child selector tabs */}
      <div className="flex gap-2 flex-wrap">
        {children.map((c, i) => (
          <button key={c.id} onClick={() => setSelected(i)} className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${i === selected ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
            <Avatar className="size-7"><AvatarFallback className={`text-xs ${i === selected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{c.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</AvatarFallback></Avatar>
            <div className="text-left">
              <div className="text-sm font-medium">{c.name}</div>
              <div className="text-[10px] text-muted-foreground">{c.className}</div>
            </div>
          </button>
        ))}
      </div>

      {child && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Attendance" value={`${child.attendancePercent}%`} sub="Last 30 days" icon={CalendarCheck} accent="emerald" />
            <StatCard label="Avg Score" value={`${child.avgPct}%`} sub="Recent exams" icon={Award} accent="violet" />
            <StatCard label="Fee Status" value={child.feeStatus === 'Clear' ? 'Clear' : fmtINR(child.dueFees)} sub={child.feeStatus === 'Clear' ? 'No dues' : 'Due'} icon={Wallet} accent={child.dueFees > 0 ? 'rose' : 'emerald'} />
            <StatCard label="Today" value={child.todayStatus} sub="Attendance" icon={child.todayStatus === 'Present' ? UserCheck : UserX} accent={child.todayStatus === 'Present' ? 'emerald' : 'rose'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><GraduationCap className="size-4 text-primary" /> {child.name}'s Recent Marks</CardTitle></CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-56 overflow-y-auto scroll-thin">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card"><tr className="border-b"><th className="text-left p-2 text-xs font-semibold">Subject</th><th className="text-right p-2 text-xs font-semibold">Score</th><th className="text-center p-2 text-xs font-semibold">Grade</th></tr></thead>
                    <tbody>
                      {child.recentMarks.map((m, i) => (
                        <tr key={i} className="border-b last:border-0"><td className="p-2">{m.subject}</td><td className="p-2 text-right tabular-nums">{m.obtained}/{m.maxMarks}</td><td className="p-2 text-center"><Badge variant={m.pct >= 80 ? 'default' : m.pct >= 60 ? 'secondary' : 'destructive'} className="text-[10px]">{m.grade}</Badge></td></tr>
                      ))}
                      {!child.recentMarks.length && <tr><td colSpan={3} className="p-4 text-center text-muted-foreground text-xs">No marks yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Fee Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Fees</span><span className="font-medium tabular-nums">{fmtINR(child.totalFees)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Paid</span><span className="font-medium tabular-nums text-emerald-600">{fmtINR(child.paidFees)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Outstanding</span><span className="font-bold tabular-nums text-rose-600">{fmtINR(child.dueFees)}</span></div>
                  <Progress value={(child.paidFees / Math.max(child.totalFees,1)) * 100} className="h-2" />
                  <div className="flex items-center justify-between pt-2">
                    <StatusBadge status={child.feeStatus === 'Clear' ? 'Paid' : child.feeStatus === 'Partial' ? 'Partial' : 'Overdue'} />
                    {child.dueFees > 0 && <Button size="sm" onClick={() => setModule('fees')}><Wallet className="size-3.5 mr-1" /> Pay Now</Button>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Full Profile', icon: Users, m: 'students' as const },
              { label: 'Attendance', icon: CalendarCheck, m: 'attendance' as const },
              { label: 'Results', icon: GraduationCap, m: 'exams' as const },
              { label: 'Timetable', icon: Clock, m: 'timetable' as const },
            ].map(q => (
              <button key={q.label} onClick={() => setModule(q.m)} className="flex items-center gap-2 p-3 rounded-xl border hover:border-primary hover:bg-primary/5 transition-colors text-left">
                <q.icon className="size-4 text-primary" /><span className="text-sm font-medium">{q.label}</span><ChevronRight className="size-4 ml-auto text-muted-foreground" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ============ TEACHER DASHBOARD ============
export function TeacherDashboard() {
  const { user, setModule, setAiAssistantOpen } = useStore()
  const { data, isLoading } = useQuery({ queryKey: ['me', user?.id], queryFn: api.dashboard.me, enabled: !!user })
  const teacherClasses: any[] = data?.teacherClasses || []

  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-28" />)}</div>

  const totalStudents = teacherClasses.reduce((s, c) => s + (c._count?.students || 0), 0)

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white p-6">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="relative">
          <p className="text-xs uppercase tracking-wider opacity-90">Teacher Portal · {ROLE_LABELS[user!.role]}</p>
          <h2 className="text-2xl font-bold">Welcome, {user?.name} 👋</h2>
          <p className="text-sm opacity-90">You teach {teacherClasses.length} classes · {totalStudents} students across your sections</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="My Classes" value={teacherClasses.length} sub="Assigned" icon={BookOpen} accent="primary" />
        <StatCard label="My Students" value={totalStudents} sub="Across sections" icon={Users} accent="emerald" />
        <StatCard label="Sections" value={teacherClasses.reduce((s,c)=>s+c.sections.length,0)} sub="Class sections" icon={Users} accent="violet" />
        <StatCard label="Today" value={new Date().toLocaleDateString('en-IN',{weekday:'short'})} sub="Quick mark attendance" icon={Calendar} accent="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><BookOpen className="size-4 text-primary" /> My Classes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {teacherClasses.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.sections.length} sections · {c._count.students} students</div>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setModule('attendance')}><CalendarCheck className="size-3 mr-1" /> Attendance</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setModule('students')}><Users className="size-3 mr-1" /> Students</Button>
                </div>
              </div>
            ))}
            {!teacherClasses.length && <p className="text-sm text-muted-foreground text-center py-4">No classes assigned yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><ClipboardList className="size-4 text-primary" /> Quick Actions</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {[
              { label: 'Mark Attendance', icon: CalendarCheck, m: 'attendance' as const },
              { label: 'Enter Marks', icon: GraduationCap, m: 'exams' as const },
              { label: 'My Timetable', icon: Clock, m: 'timetable' as const },
              { label: 'Message Class', icon: BookOpen, m: 'communication' as const },
              { label: 'View Students', icon: Users, m: 'students' as const },
              { label: 'Issue Library Book', icon: BookOpen, m: 'library' as const },
            ].map(q => (
              <button key={q.label} onClick={() => setModule(q.m)} className="flex flex-col items-center gap-2 p-3 rounded-xl border hover:border-primary hover:bg-primary/5 transition-colors text-center">
                <q.icon className="size-5 text-primary" /><span className="text-[11px] font-medium leading-tight">{q.label}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-center gap-3">
          <Sparkles className="size-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">AI Teaching Assistant</p>
            <p className="text-xs text-muted-foreground">Get insights on class performance, draft parent messages, or analyze student progress.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAiAssistantOpen(true)}>Ask Vidya</Button>
        </CardContent>
      </Card>
    </div>
  )
}
