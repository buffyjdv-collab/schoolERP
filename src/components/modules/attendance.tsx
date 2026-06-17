'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ClassInfo, Student } from '@/lib/types'
import { StatCard, SectionHeader, StatusBadge, EmptyState } from '@/components/erp/primitives'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  CalendarCheck, UserCheck, UserX, Clock3, Plane, Radio, Cpu,
  DoorOpen, LogIn, Save, CheckCheck, RefreshCw, GraduationCap, ScanLine,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ============================================================
// Attendance status meta
// ============================================================
type AttStatus = 'Present' | 'Absent' | 'Late' | 'Leave' | 'HalfDay'

const STATUS_META: Record<AttStatus, { label: string; active: string; idle: string; dot: string }> = {
  Present: {
    label: 'P',
    active: 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600',
    idle: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  Absent: {
    label: 'A',
    active: 'bg-rose-500 text-white shadow-sm hover:bg-rose-600',
    idle: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20',
    dot: 'bg-rose-500',
  },
  Late: {
    label: 'L',
    active: 'bg-amber-500 text-white shadow-sm hover:bg-amber-600',
    idle: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20',
    dot: 'bg-amber-500',
  },
  Leave: {
    label: 'LV',
    active: 'bg-sky-500 text-white shadow-sm hover:bg-sky-600',
    idle: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 hover:bg-sky-500/20',
    dot: 'bg-sky-500',
  },
  HalfDay: {
    label: 'HD',
    active: 'bg-violet-500 text-white shadow-sm hover:bg-violet-600',
    idle: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 hover:bg-violet-500/20',
    dot: 'bg-violet-500',
  },
}

const STATUS_ORDER: AttStatus[] = ['Present', 'Absent', 'Late', 'Leave', 'HalfDay']

function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function rateColor(r: number): string {
  if (r >= 90) return 'bg-emerald-500'
  if (r >= 75) return 'bg-amber-500'
  return 'bg-rose-500'
}

// ============================================================
// Mark Attendance panel (left pane)
// ============================================================
interface ClassAttRow {
  student: {
    id: string
    admissionNo: string
    firstName: string
    lastName: string
    fullName: string
    rollNo?: number | null
    sectionName?: string | null
  }
  status: string
}

function StatusButtonGroup({
  value, onChange,
}: {
  value: AttStatus | 'NotMarked'
  onChange: (s: AttStatus) => void
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-muted/40 p-0.5">
      {STATUS_ORDER.map((s) => {
        const meta = STATUS_META[s]
        const active = value === s
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            title={s}
            aria-pressed={active}
            className={cn(
              'size-7 rounded-md text-[11px] font-bold transition-all',
              active ? meta.active : meta.idle,
            )}
          >
            {meta.label}
          </button>
        )
      })}
    </div>
  )
}

function MarkAttendancePanel({
  classes,
}: {
  classes: ClassInfo[]
}) {
  const qc = useQueryClient()
  const [classId, setClassId] = useState<string>('')
  const [date, setDate] = useState<string>(todayStr())
  const [edits, setEdits] = useState<Record<string, AttStatus>>({})

  // Reset classId to first class on first load (no set-state-in-effect; safe initial state via useMemo)
  const effectiveClassId = classId || (classes[0]?.id ?? '')

  const attQ = useQuery({
    queryKey: ['attendance', 'class', effectiveClassId, date],
    queryFn: () => api.attendance.classAttendance(effectiveClassId, date),
    enabled: !!effectiveClassId && !!date,
  })

  const rows: ClassAttRow[] = attQ.data ?? []

  // Resolve the displayed status for a row — edits win over server status
  const displayStatus = (r: ClassAttRow): AttStatus | 'NotMarked' => {
    if (edits[r.student.id]) return edits[r.student.id]
    if (r.status === 'NotMarked') return 'NotMarked'
    return (STATUS_ORDER.includes(r.status as AttStatus) ? r.status : 'NotMarked') as AttStatus | 'NotMarked'
  }

  // Counts: computed inline (without useMemo) so the React Compiler can memoize automatically.
  const counts = (() => {
    const c = { Present: 0, Absent: 0, Late: 0, Leave: 0, HalfDay: 0, NotMarked: 0 }
    for (const r of rows) {
      const s = displayStatus(r)
      if (s === 'NotMarked') c.NotMarked++
      else c[s]++
    }
    return c
  })()

  const markMutation = useMutation({
    mutationFn: (payload: { studentId: string; date: string; status: string; method?: string }) =>
      api.attendance.mark(payload),
  })

  const handleSet = (studentId: string, s: AttStatus) => {
    setEdits((prev) => ({ ...prev, [studentId]: s }))
  }

  const handleMarkAllPresent = () => {
    const next: Record<string, AttStatus> = {}
    for (const r of rows) next[r.student.id] = 'Present'
    setEdits(next)
    toast.info('Marked all as Present', { description: 'Review and click Save Attendance to commit.' })
  }

  const handleSave = async () => {
    if (!rows.length) return
    // Compute actual changes (edits that differ from server status)
    const changed = rows
      .map((r) => ({ studentId: r.student.id, status: edits[r.student.id], original: r.status }))
      .filter((x) => x.status && x.status !== x.original)

    if (changed.length === 0) {
      toast.info('Nothing to save', { description: 'No attendance changes detected.' })
      return
    }

    try {
      await Promise.all(
        changed.map((c) =>
          markMutation.mutateAsync({
            studentId: c.studentId,
            date,
            status: c.status as string,
            method: 'Manual',
          }),
        ),
      )
      toast.success(`Attendance saved for ${changed.length} student${changed.length === 1 ? '' : 's'}`, {
        description: `${counts.Present} Present · ${counts.Absent} Absent · ${counts.Late} Late`,
      })
      setEdits({})
      qc.invalidateQueries({ queryKey: ['attendance', 'summary'] })
      qc.invalidateQueries({ queryKey: ['attendance', 'class', effectiveClassId, date] })
    } catch (e: any) {
      toast.error('Failed to save attendance', { description: e?.message || 'Please retry.' })
    }
  }

  const handleClassChange = (v: string) => {
    setClassId(v)
    setEdits({})
  }
  const handleDateChange = (v: string) => {
    setDate(v)
    setEdits({})
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck className="size-4 text-primary" /> Mark Attendance
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Select a class &amp; date, then mark each student&apos;s status.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={effectiveClassId} onValueChange={handleClassChange}>
              <SelectTrigger size="sm" className="w-40">
                <GraduationCap className="size-3.5 text-muted-foreground" />
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="h-8 rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30"
                aria-label="Attendance date"
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        {/* Summary strip */}
        <div className="px-6 pb-3 flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary" className="gap-1">
            <span className={cn('size-1.5 rounded-full', STATUS_META.Present.dot)} /> {counts.Present} Present
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <span className={cn('size-1.5 rounded-full', STATUS_META.Absent.dot)} /> {counts.Absent} Absent
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <span className={cn('size-1.5 rounded-full', STATUS_META.Late.dot)} /> {counts.Late} Late
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <span className={cn('size-1.5 rounded-full', STATUS_META.Leave.dot)} /> {counts.Leave} Leave
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <span className={cn('size-1.5 rounded-full', STATUS_META.HalfDay.dot)} /> {counts.HalfDay} HalfDay
          </Badge>
          <span className="ml-auto text-muted-foreground">Total: {rows.length}</span>
        </div>

        {/* Actions row */}
        <div className="px-6 pb-3 flex flex-wrap items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={handleMarkAllPresent} disabled={!rows.length}>
            <CheckCheck className="size-4" /> Mark All Present
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!rows.length || markMutation.isPending}
          >
            {markMutation.isPending ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Attendance
          </Button>
        </div>

        {/* Table */}
        {!effectiveClassId ? (
          <div className="px-6 pb-6">
            <EmptyState icon={GraduationCap} title="Select a class" description="Pick a class above to load the student roster." />
          </div>
        ) : attQ.isLoading ? (
          <div className="px-6 pb-6 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : attQ.isError ? (
          <div className="px-6 pb-6">
            <EmptyState icon={RefreshCw} title="Failed to load roster" description="Please retry in a moment." />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 pb-6">
            <EmptyState icon={UserCheck} title="No students in this class" description="There are no active students enrolled in the selected class." />
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto scroll-thin border-t">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="pl-6 w-12">#</TableHead>
                  <TableHead>Adm. No.</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="hidden md:table-cell">Section</TableHead>
                  <TableHead className="text-right pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, idx) => {
                  const s = displayStatus(r)
                  const dirty = !!edits[r.student.id] && edits[r.student.id] !== r.status
                  return (
                    <TableRow key={r.student.id} className={cn(dirty && 'bg-primary/5')}>
                      <TableCell className="pl-6 text-muted-foreground tabular-nums text-xs">{r.student.rollNo ?? idx + 1}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px] tabular-nums">{r.student.admissionNo}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-full bg-primary/10 text-primary grid place-items-center text-[10px] font-bold shrink-0">
                            {r.student.firstName?.[0]}{r.student.lastName?.[0]}
                          </div>
                          <span className="truncate">{r.student.fullName}</span>
                          {dirty && <span className="size-1.5 rounded-full bg-primary animate-pulse" title="Unsaved change" />}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{r.student.sectionName || '-'}</TableCell>
                      <TableCell className="pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {s !== 'NotMarked' && (
                            <span className="text-[11px] text-muted-foreground hidden sm:inline">{s}</span>
                          )}
                          <StatusButtonGroup
                            value={s}
                            onChange={(next) => handleSet(r.student.id, next)}
                          />
                        </div>
                      </TableCell>
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

// ============================================================
// Class-wise attendance (right pane)
// ============================================================
function ClassWiseAttendance({
  byClass, loading,
}: {
  byClass: { label: string; rate: number }[]
  loading: boolean
}) {
  const max = 100
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <GraduationCap className="size-4 text-primary" /> Class-wise Attendance
        </CardTitle>
        <CardDescription className="text-xs">Today&apos;s present-rate by class.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : byClass.length === 0 ? (
          <EmptyState icon={GraduationCap} title="No data" description="Attendance records will appear here once marked." />
        ) : (
          <div className="max-h-[55vh] overflow-y-auto scroll-thin space-y-3 pr-1">
            {byClass
              .slice()
              .sort((a, b) => b.rate - a.rate)
              .map((c) => (
                <div key={c.label} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{c.label}</span>
                    <span className={cn(
                      'text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded',
                      c.rate >= 90 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : c.rate >= 75 ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
                    )}>{c.rate}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', rateColor(c.rate))}
                      style={{ width: `${Math.min(c.rate, max)}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// UHF / RFID Live tab
// ============================================================
interface UhfEntry {
  id: string
  time: string
  student: Student
  action: 'IN' | 'OUT'
  tag: string
}

function UhfRfidLive() {
  const studentsQ = useQuery({
    queryKey: ['students', 'list', 'uhf'],
    queryFn: () => api.students.list({ status: 'Active' }),
  })
  const students = studentsQ.data ?? []

  const [entries, setEntries] = useState<UhfEntry[]>([])
  const [active, setActive] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const counterRef = useRef(0)

  useEffect(() => {
    if (!active || students.length === 0) return

    const pushEntry = () => {
      const s = students[Math.floor(Math.random() * students.length)]
      const isIn = Math.random() > 0.35
      counterRef.current += 1
      const entry: UhfEntry = {
        id: `uhf-${Date.now()}-${counterRef.current}`,
        time: new Date().toISOString(),
        student: s,
        action: isIn ? 'IN' : 'OUT',
        tag: `E2 00 ${Math.random().toString(16).slice(2, 6).toUpperCase()} ${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
      }
      setEntries((prev) => [entry, ...prev].slice(0, 10))
    }

    // schedule first push with a short delay so the panel feels alive immediately
    timerRef.current = setTimeout(function tick() {
      pushEntry()
      timerRef.current = setTimeout(tick, 3000 + Math.random() * 2000)
    }, 800)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [active, students])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Reader info card */}
      <Card className="lg:col-span-1 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-primary text-primary-foreground grid place-items-center">
                <Radio className="size-6" />
              </div>
              <div>
                <CardTitle className="text-base">UHF Gate Reader</CardTitle>
                <CardDescription className="text-xs">Main Gate · Reader #VM-UHF-01</CardDescription>
              </div>
            </div>
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
              active ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground',
            )}>
              <span className={cn('size-1.5 rounded-full', active ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground')} />
              {active ? 'System Active' : 'Paused'}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Frequency</p>
              <p className="font-semibold tabular-nums">865–868 MHz</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Protocol</p>
              <p className="font-semibold">EPC Gen2</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Read Range</p>
              <p className="font-semibold tabular-nums">~6 m</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Today&apos;s Reads</p>
              <p className="font-semibold tabular-nums">{entries.length}</p>
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 text-xs">
            <div className="flex items-center gap-2 mb-1.5">
              <Cpu className="size-3.5 text-primary" />
              <span className="font-semibold">Reader Health</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-bold tabular-nums text-emerald-600">98%</p>
                <p className="text-[10px] text-muted-foreground">Uptime</p>
              </div>
              <div>
                <p className="font-bold tabular-nums">-58</p>
                <p className="text-[10px] text-muted-foreground">RSSI dBm</p>
              </div>
              <div>
                <p className="font-bold tabular-nums">0</p>
                <p className="text-[10px] text-muted-foreground">Errors</p>
              </div>
            </div>
          </div>

          <Button
            variant={active ? 'outline' : 'default'}
            size="sm"
            className="w-full"
            onClick={() => setActive((a) => !a)}
          >
            {active ? <><RefreshCw className="size-4" /> Pause Feed</> : <><Radio className="size-4" /> Resume Feed</>}
          </Button>
        </CardContent>
      </Card>

      {/* Live feed */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ScanLine className="size-4 text-primary" /> Live Tag Reads
            </CardTitle>
            <Badge variant="secondary" className="gap-1 text-[11px]">
              <span className={cn('size-1.5 rounded-full', active ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground')} />
              {active ? 'Streaming' : 'Paused'} · Last 10
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {studentsQ.isLoading ? (
            <div className="px-6 pb-6 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : entries.length === 0 ? (
            <div className="px-6 pb-6">
              <EmptyState icon={ScanLine} title="Waiting for tag reads" description="The reader is online and listening for student ID cards." />
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto scroll-thin border-t">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="pl-6 w-16">Dir</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead className="hidden md:table-cell">Class</TableHead>
                    <TableHead className="hidden lg:table-cell">EPC Tag</TableHead>
                    <TableHead className="pr-6 text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id} className="animate-in fade-in slide-in-from-top-1 duration-300">
                      <TableCell className="pl-6">
                        <span className={cn(
                          'inline-flex items-center justify-center size-7 rounded-lg',
                          e.action === 'IN' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600',
                        )} title={e.action === 'IN' ? 'Entry' : 'Exit'}>
                          {e.action === 'IN' ? <LogIn className="size-4" /> : <DoorOpen className="size-4" />}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="size-7 rounded-full bg-primary/10 text-primary grid place-items-center text-[10px] font-bold shrink-0">
                            {e.student.firstName?.[0]}{e.student.lastName?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{e.student.fullName}</p>
                            <p className="text-[11px] text-muted-foreground tabular-nums">{e.student.admissionNo}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{e.student.className || '-'}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded tabular-nums">{e.tag}</code>
                      </TableCell>
                      <TableCell className="pr-6 text-right text-xs text-muted-foreground tabular-nums">
                        {new Date(e.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Main module
// ============================================================
export function AttendanceModule() {
  const summaryQ = useQuery({ queryKey: ['attendance', 'summary'], queryFn: () => api.attendance.summary() })
  const classesQ = useQuery({ queryKey: ['academics', 'classes'], queryFn: api.academics.classes })

  const summary = summaryQ.data
  const byClass = summary?.byClass ?? []

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Attendance"
        description="Mark daily attendance, monitor class-wise rates, and view live UHF/RFID gate reads."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Attendance Rate"
          value={summary ? `${summary.rate}%` : '—'}
          sub="Today's overall"
          icon={CalendarCheck}
          accent="primary"
          loading={summaryQ.isLoading}
        />
        <StatCard
          label="Present Today"
          value={summary?.present ?? '—'}
          sub="Marked present"
          icon={UserCheck}
          accent="emerald"
          loading={summaryQ.isLoading}
        />
        <StatCard
          label="Absent Today"
          value={summary?.absent ?? '—'}
          sub="Needs follow-up"
          icon={UserX}
          accent="rose"
          loading={summaryQ.isLoading}
        />
        <StatCard
          label="Late Today"
          value={summary?.late ?? '—'}
          sub="Arrived after bell"
          icon={Clock3}
          accent="amber"
          loading={summaryQ.isLoading}
        />
        <StatCard
          label="On Leave"
          value={summary?.leave ?? '—'}
          sub="Approved leaves"
          icon={Plane}
          accent="sky"
          loading={summaryQ.isLoading}
        />
      </div>

      <Tabs defaultValue="mark">
        <TabsList>
          <TabsTrigger value="mark" className="gap-1.5"><CalendarCheck className="size-4" /> Mark Attendance</TabsTrigger>
          <TabsTrigger value="uhf" className="gap-1.5"><Radio className="size-4" /> UHF / RFID Live</TabsTrigger>
        </TabsList>

        <TabsContent value="mark" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="lg:col-span-2">
              {classesQ.isLoading ? (
                <Card><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card>
              ) : classesQ.isError ? (
                <Card><CardContent className="py-2"><EmptyState icon={RefreshCw} title="Failed to load classes" description="Please retry." /></CardContent></Card>
              ) : (classesQ.data ?? []).length === 0 ? (
                <Card><CardContent className="py-2"><EmptyState icon={GraduationCap} title="No classes found" description="Set up classes in Academics to mark attendance." /></CardContent></Card>
              ) : (
                <MarkAttendancePanel classes={classesQ.data!} />
              )}
            </div>
            <div className="lg:col-span-1">
              <ClassWiseAttendance byClass={byClass} loading={summaryQ.isLoading} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="uhf" className="mt-4">
          <UhfRfidLive />
        </TabsContent>
      </Tabs>
    </div>
  )
}
