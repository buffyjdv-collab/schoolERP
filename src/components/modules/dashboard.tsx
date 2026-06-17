'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { StatCard, SectionHeader } from '@/components/erp/primitives'
import {
  Users, UserCheck, UserX, Wallet, TrendingDown, Bus, BookOpen,
  UserPlus, CalendarCheck, Sparkles, Activity, GraduationCap, RefreshCw,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useStore } from '@/lib/store'
import { useState } from 'react'
import { toast } from 'sonner'

const PIE_COLORS = ['#10b981', '#14b8a6', '#f59e0b', '#f43f5e', '#8b5cf6', '#0ea5e9']

function fmtINR(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n}`
}

export function DashboardModule() {
  const { setModule, setAiAssistantOpen } = useStore()
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insights, setInsights] = useState<string>('')

  const { data: stats, isLoading } = useQuery({ queryKey: ['stats'], queryFn: api.dashboard.stats })
  const { data: attTrend } = useQuery({ queryKey: ['att-trend'], queryFn: api.dashboard.attendanceTrend })
  const { data: feeTrend } = useQuery({ queryKey: ['fee-trend'], queryFn: api.dashboard.feeCollectionTrend })
  const { data: classDist } = useQuery({ queryKey: ['class-dist'], queryFn: api.dashboard.classDistribution })
  const { data: genderRatio } = useQuery({ queryKey: ['gender'], queryFn: api.dashboard.genderRatio })
  const { data: activity } = useQuery({ queryKey: ['activity'], queryFn: api.dashboard.recentActivity })

  const generateInsights = async () => {
    setInsightsLoading(true)
    try {
      const data = await api.ai.insights()
      setInsights(data.insights)
    } catch (e: any) {
      toast.error('Failed to generate insights')
    } finally {
      setInsightsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-emerald-600 text-primary-foreground p-6 lg:p-8">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wider opacity-90">AI-Powered School ERP</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold">Welcome back, Admin Office 👋</h2>
            <p className="text-sm opacity-90 mt-1 max-w-xl">
              Here's what's happening across your institution today. {stats?.presentToday ?? 0} students present, {stats?.feeDefaulters ?? 0} fee defaulters pending follow-up.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={generateInsights} disabled={insightsLoading}>
              {insightsLoading ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Generate AI Insights
            </Button>
            <Button variant="secondary" size="sm" className="gap-1.5 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground" onClick={() => setAiAssistantOpen(true)}>
              Ask Vidya AI
            </Button>
          </div>
        </div>
      </div>

      {/* AI insights panel */}
      {insights && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="size-8 rounded-lg bg-primary grid place-items-center shrink-0">
                <Sparkles className="size-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">AI-Generated Insights</span>
                  <Badge variant="secondary" className="text-[10px]">Live Data</Badge>
                </div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{insights}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={stats?.totalStudents ?? '—'} sub="Active enrolment" icon={Users} accent="primary" loading={isLoading}
          trend={{ value: '+24 this month', up: true }} />
        <StatCard label="Present Today" value={stats?.presentToday ?? '—'} sub={`${stats?.attendanceRate ?? 0}% attendance rate`} icon={UserCheck} accent="emerald" loading={isLoading} />
        <StatCard label="Absent Today" value={stats?.absentToday ?? '—'} sub="Needs follow-up" icon={UserX} accent="rose" loading={isLoading} />
        <StatCard label="Fee Collected" value={fmtINR(stats?.feeCollected ?? 0)} sub="Cumulative" icon={Wallet} accent="emerald" loading={isLoading} />
        <StatCard label="Fee Pending" value={fmtINR(stats?.feePending ?? 0)} sub={`${stats?.feeDefaulters ?? 0} defaulters`} icon={TrendingDown} accent="amber" loading={isLoading} />
        <StatCard label="Employees" value={stats?.totalEmployees ?? '—'} sub="Active staff" icon={GraduationCap} accent="violet" loading={isLoading} />
        <StatCard label="Buses Active" value={stats?.vehiclesActive ?? '—'} sub="Live on route" icon={Bus} accent="sky" loading={isLoading} />
        <StatCard label="Books Issued" value={stats?.booksIssued ?? '—'} sub="In circulation" icon={BookOpen} accent="amber" loading={isLoading} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Activity className="size-4 text-primary" /> Attendance Trend (14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={attTrend || []} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gAbsent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} fill="url(#gPresent)" name="Present" />
                <Area type="monotone" dataKey="absent" stroke="#f43f5e" strokeWidth={2} fill="url(#gAbsent)" name="Absent" />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="size-4 text-primary" /> Gender Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={genderRatio || []} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {(genderRatio || []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Wallet className="size-4 text-primary" /> Fee Collection (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={feeTrend || []} margin={{ left: -10, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => fmtINR(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="collected" fill="#10b981" name="Collected" radius={[4,4,0,0]} />
                <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Students per Class</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={classDist || []} layout="vertical" margin={{ left: 20, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" width={60} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="#14b8a6" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity + quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Activity className="size-4 text-primary" /> Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activity?.length ? (
              <div className="space-y-2.5 max-h-72 overflow-y-auto scroll-thin pr-1">
                {activity.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 text-sm py-1.5 border-b last:border-0">
                    <div className={`size-2 rounded-full mt-1.5 shrink-0 ${a.type === 'fee' ? 'bg-emerald-500' : a.type === 'leave' ? 'bg-amber-500' : a.type === 'library' ? 'bg-violet-500' : 'bg-sky-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{a.text}</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(a.time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <Skeleton className="h-40 w-full" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {[
              { label: 'New Admission', icon: UserPlus, m: 'admissions' as const },
              { label: 'Mark Attendance', icon: CalendarCheck, m: 'attendance' as const },
              { label: 'Collect Fee', icon: Wallet, m: 'fees' as const },
              { label: 'Track Bus', icon: Bus, m: 'transport' as const },
              { label: 'Issue Book', icon: BookOpen, m: 'library' as const },
              { label: 'View Students', icon: Users, m: 'students' as const },
            ].map((q) => (
              <button key={q.label} onClick={() => setModule(q.m)} className="flex flex-col items-center gap-2 p-3 rounded-xl border hover:border-primary hover:bg-primary/5 transition-colors text-center">
                <q.icon className="size-5 text-primary" />
                <span className="text-[11px] font-medium leading-tight">{q.label}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
