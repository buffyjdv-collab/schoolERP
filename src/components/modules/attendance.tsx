'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ClassInfo, Student, AttendanceRecord } from '@/lib/types'
import { useCan, useStore } from '@/lib/store'
import type { AuthUser } from '@/lib/rbac'
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  CalendarCheck, CalendarDays, UserCheck, UserX, Clock3, Plane, Radio, Cpu,
  DoorOpen, LogIn, Save, CheckCheck, RefreshCw, GraduationCap, ScanLine,
  ChevronDown, TrendingUp, Users, CalendarRange, ChevronRight, X, History,
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
  const [sectionId, setSectionId] = useState<string>('')
  const [date, setDate] = useState<string>(todayStr())
  const [edits, setEdits] = useState<Record<string, AttStatus>>({})
  const [historyStudent, setHistoryStudent] = useState<{ id: string; name: string; admissionNo: string; sectionName?: string | null } | null>(null)

  // Reset classId to first class on first load (no set-state-in-effect; safe initial state via useMemo)
  const effectiveClassId = classId || (classes[0]?.id ?? '')
  // Reset section when class changes
  const [prevClassId, setPrevClassId] = useState(effectiveClassId)
  if (effectiveClassId !== prevClassId) {
    setPrevClassId(effectiveClassId)
    setSectionId('')
  }

  const selectedClass = classes.find((c) => c.id === effectiveClassId)
  const classSections = selectedClass?.sections ?? []
  const effectiveSectionId = sectionId && sectionId !== '__all__' ? sectionId : undefined

  const attQ = useQuery({
    queryKey: ['attendance', 'class', effectiveClassId, effectiveSectionId ?? 'all', date],
    queryFn: () => api.attendance.classAttendance(effectiveClassId, date, effectiveSectionId),
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
      qc.invalidateQueries({ queryKey: ['attendance', 'class', effectiveClassId, effectiveSectionId ?? 'all', date] })
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
            {classSections.length > 0 && (
              <Select value={sectionId || '__all__'} onValueChange={(v) => { setSectionId(v); setEdits({}) }}>
                <SelectTrigger size="sm" className="w-40">
                  <Users className="size-3.5 text-muted-foreground" />
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Sections</SelectItem>
                  {classSections.map((sec) => (
                    <SelectItem key={sec.id} value={sec.id}>{sec.name} · {sec.studentCount ?? 0}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
                        <button
                          type="button"
                          onClick={() => setHistoryStudent({
                            id: r.student.id,
                            name: r.student.fullName,
                            admissionNo: r.student.admissionNo,
                            sectionName: r.student.sectionName,
                          })}
                          className="flex items-center gap-2 text-left rounded-md p-0.5 -m-0.5 hover:bg-accent/60 transition-colors w-full group/name"
                          title="Click to view attendance history"
                        >
                          <div className="size-7 rounded-full bg-primary/10 text-primary grid place-items-center text-[10px] font-bold shrink-0">
                            {r.student.firstName?.[0]}{r.student.lastName?.[0]}
                          </div>
                          <span className="truncate inline-flex items-center gap-1">
                            {r.student.fullName}
                            <History className="size-3 text-muted-foreground/0 group-hover/name:text-primary transition-colors" />
                          </span>
                          {dirty && <span className="size-1.5 rounded-full bg-primary animate-pulse" title="Unsaved change" />}
                        </button>
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

      <StudentAttendanceHistoryDialog
        student={historyStudent}
        open={historyStudent !== null}
        onOpenChange={(v) => { if (!v) setHistoryStudent(null) }}
      />
    </Card>
  )
}

// ============================================================
// Student Attendance History Dialog (lightbox)
// Shows month-wise collapsible attendance history when a student is clicked.
// ============================================================
const HISTORY_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function statusChipClass(status: string): string {
  if (status === 'Present') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
  if (status === 'Absent') return 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
  if (status === 'Late') return 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
  if (status === 'Leave') return 'bg-sky-500/15 text-sky-700 dark:text-sky-400'
  if (status === 'HalfDay') return 'bg-violet-500/15 text-violet-700 dark:text-violet-400'
  return 'bg-muted text-muted-foreground'
}

function statusDotClass(status: string): string {
  if (status === 'Present') return 'bg-emerald-500'
  if (status === 'Absent') return 'bg-rose-500'
  if (status === 'Late') return 'bg-amber-500'
  if (status === 'Leave') return 'bg-sky-500'
  if (status === 'HalfDay') return 'bg-violet-500'
  return 'bg-muted-foreground'
}

function StudentAttendanceHistoryDialog({
  student, open, onOpenChange,
}: {
  student: { id: string; name: string; admissionNo: string; sectionName?: string | null } | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const attQ = useQuery({
    queryKey: ['students', student?.id, 'attendance', 'history'],
    queryFn: () => api.students.attendance(student!.id),
    enabled: !!student?.id && open,
  })

  const records: AttendanceRecord[] = attQ.data ?? []

  // Group records by month (YYYY-MM)
  const monthGroups = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>()
    for (const r of records) {
      const d = new Date(r.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    // Sort months descending (most recent first)
    return Array.from(map.entries())
      .map(([key, recs]) => {
        const [year, month] = key.split('-').map(Number)
        const present = recs.filter(r => r.status === 'Present').length
        const absent = recs.filter(r => r.status === 'Absent').length
        const late = recs.filter(r => r.status === 'Late').length
        const leave = recs.filter(r => r.status === 'Leave').length
        const halfDay = recs.filter(r => r.status === 'HalfDay').length
        const rate = recs.length ? Math.round((present / recs.length) * 100) : 0
        // Sort records within month by date descending
        recs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        return { key, year, month, label: `${HISTORY_MONTH_NAMES[month - 1]} ${year}`, records: recs, present, absent, late, leave, halfDay, total: recs.length, rate }
      })
      .sort((a, b) => b.key.localeCompare(a.key))
  }, [records])

  // Overall stats
  const totalPresent = records.filter(r => r.status === 'Present').length
  const overallRate = records.length ? Math.round((totalPresent / records.length) * 100) : 0

  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)
  // Auto-expand the most recent month on first load
  const [prevStudentId, setPrevStudentId] = useState(student?.id ?? '')
  if (student?.id && student.id !== prevStudentId) {
    setPrevStudentId(student.id)
    setExpandedMonth(monthGroups[0]?.key ?? null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0">
        {/* Header */}
        <DialogHeader className="sr-only">
          <DialogTitle>Attendance History</DialogTitle>
          <DialogDescription>Month-wise attendance breakdown for {student?.name}</DialogDescription>
        </DialogHeader>

        {/* Modern gradient header */}
        <div className="relative bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground p-5 overflow-hidden">
          <div className="absolute -top-10 -right-10 size-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-11 rounded-xl bg-white/20 backdrop-blur grid place-items-center shrink-0">
                <History className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-base truncate">{student?.name ?? 'Student'}</p>
                <p className="text-xs opacity-90">
                  {student?.admissionNo}
                  {student?.sectionName ? ` · Section ${student.sectionName}` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="size-8 rounded-lg bg-white/15 hover:bg-white/25 grid place-items-center transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Overall stats strip */}
          <div className="relative mt-4 flex items-center gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wide opacity-80">Overall Rate</p>
              <p className="text-2xl font-bold tabular-nums">{overallRate}%</p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <p className="text-[10px] uppercase tracking-wide opacity-80">Records</p>
              <p className="text-2xl font-bold tabular-nums">{records.length}</p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <p className="text-[10px] uppercase tracking-wide opacity-80">Months</p>
              <p className="text-2xl font-bold tabular-nums">{monthGroups.length}</p>
            </div>
          </div>
        </div>

        {/* Body — month-wise collapsible */}
        <div className="flex-1 overflow-y-auto scroll-thin">
          {attQ.isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : attQ.isError ? (
            <div className="p-5"><EmptyState icon={RefreshCw} title="Failed to load" description="Please retry." /></div>
          ) : monthGroups.length === 0 ? (
            <div className="p-5"><EmptyState icon={CalendarDays} title="No attendance records" description="This student has no attendance history yet." /></div>
          ) : (
            <div className="divide-y">
              {monthGroups.map((mg) => {
                const isExpanded = expandedMonth === mg.key
                return (
                  <div key={mg.key} className="transition-colors">
                    {/* Month header (clickable) */}
                    <button
                      type="button"
                      onClick={() => setExpandedMonth(isExpanded ? null : mg.key)}
                      className="w-full text-left px-5 py-3 hover:bg-accent/40 transition-colors flex items-center gap-3"
                    >
                      <div className={cn(
                        'size-9 rounded-lg grid place-items-center shrink-0 text-xs font-bold',
                        mg.rate >= 90 ? 'bg-emerald-500/15 text-emerald-600'
                          : mg.rate >= 75 ? 'bg-amber-500/15 text-amber-600'
                            : 'bg-rose-500/15 text-rose-600',
                      )}>
                        {HISTORY_MONTH_NAMES[mg.month - 1].slice(0, 3)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm">{mg.label}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {/* Mini status badges */}
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span className="size-1.5 rounded-full bg-emerald-500" />{mg.present}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span className="size-1.5 rounded-full bg-rose-500" />{mg.absent}
                          </span>
                          {mg.late > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <span className="size-1.5 rounded-full bg-amber-500" />{mg.late}
                            </span>
                          )}
                          {mg.leave > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <span className="size-1.5 rounded-full bg-sky-500" />{mg.leave}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-1">· {mg.total} days</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn(
                          'text-sm font-bold tabular-nums px-2 py-0.5 rounded',
                          mg.rate >= 90 ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                            : mg.rate >= 75 ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                              : 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
                        )}>
                          {mg.rate}%
                        </span>
                        <ChevronDown className={cn(
                          'size-4 text-muted-foreground transition-transform',
                          isExpanded && 'rotate-180',
                        )} />
                      </div>
                    </button>

                    {/* Expanded daily records */}
                    {isExpanded && (
                      <div className="px-5 pb-3 pt-1 bg-muted/20">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {mg.records.map((r) => {
                            const d = new Date(r.date)
                            return (
                              <div key={r.id} className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5">
                                <span className={cn('size-2 rounded-full shrink-0', statusDotClass(r.status))} />
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-medium">
                                    {d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                                  </p>
                                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{r.method}</p>
                                </div>
                                <span className={cn(
                                  'text-[10px] font-semibold px-1.5 py-0.5 rounded tabular-nums',
                                  statusChipClass(r.status),
                                )}>
                                  {r.status}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Class-wise attendance — modern expandable view with Day/Month toggle
// ============================================================
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function rateBadgeClass(r: number): string {
  if (r >= 90) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold'
  if (r >= 75) return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold'
  if (r > 0) return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 font-semibold'
  return 'bg-muted text-muted-foreground font-medium'
}

function rateBarClass(r: number): string {
  if (r >= 90) return 'bg-gradient-to-r from-emerald-500 to-teal-500'
  if (r >= 75) return 'bg-gradient-to-r from-amber-500 to-orange-500'
  if (r > 0) return 'bg-gradient-to-r from-rose-500 to-red-500'
  return 'bg-muted-foreground/30'
}

function ClassWiseAttendance() {
  const [mode, setMode] = useState<'day' | 'month'>('day')
  const today = new Date()
  const [date, setDate] = useState<string>(todayStr())
  const [month, setMonth] = useState<string>(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
  const [expandedClass, setExpandedClass] = useState<string | null>(null)

  // Adjust state during render when mode changes (avoids useEffect)
  const [prevMode, setPrevMode] = useState(mode)
  if (prevMode !== mode) {
    setPrevMode(mode)
    setExpandedClass(null)
  }

  const cwQ = useQuery({
    queryKey: ['attendance', 'class-wise', mode, mode === 'day' ? date : month],
    queryFn: () => api.attendance.classWise(mode === 'day' ? { mode: 'day', date } : { mode: 'month', month }),
  })

  const data = cwQ.data ?? []
  const sortedData = [...data].sort((a, b) => b.rate - a.rate)
  const overallRate = data.length ? Math.round(data.reduce((acc, d) => acc + d.rate, 0) / data.length) : 0

  const handleDateChange = (v: string) => { setDate(v); setExpandedClass(null) }
  const handleMonthChange = (v: string) => { setMonth(v); setExpandedClass(null) }

  return (
    <Card className="h-full overflow-hidden border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" /> Class-wise Attendance
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {mode === 'day' ? 'Attendance % for the selected day' : 'Monthly attendance % breakdown'} · click a class to expand sections
            </CardDescription>
          </div>
          {/* Mode toggle */}
          <div className="inline-flex items-center gap-0.5 rounded-lg bg-muted/50 p-0.5">
            <button
              type="button"
              onClick={() => setMode('day')}
              className={cn(
                'inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium transition-all',
                mode === 'day' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <CalendarDays className="size-3.5" /> Day
            </button>
            <button
              type="button"
              onClick={() => setMode('month')}
              className={cn(
                'inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium transition-all',
                mode === 'month' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <CalendarRange className="size-3.5" /> Month
            </button>
          </div>
        </div>

        {/* Date/Month selector + overall rate */}
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t">
          {mode === 'day' ? (
            <div className="relative">
              <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="h-8 rounded-md border border-input bg-transparent pl-8 pr-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30"
                aria-label="Attendance date"
              />
            </div>
          ) : (
            <div className="relative">
              <CalendarRange className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="month"
                value={month}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="h-8 rounded-md border border-input bg-transparent pl-8 pr-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30"
                aria-label="Attendance month"
              />
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Overall</span>
            <span className={cn('text-sm font-bold tabular-nums px-2 py-0.5 rounded', rateBadgeClass(overallRate))}>
              {overallRate}%
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        {cwQ.isLoading ? (
          <div className="px-6 pb-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : cwQ.isError ? (
          <div className="px-6 pb-6">
            <EmptyState icon={RefreshCw} title="Failed to load" description="Please retry." />
          </div>
        ) : sortedData.length === 0 ? (
          <div className="px-6 pb-6">
            <EmptyState icon={GraduationCap} title="No data" description="Attendance records will appear here once marked." />
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto scroll-thin border-t divide-y">
            {sortedData.map((c) => {
              const isExpanded = expandedClass === c.classId
              const goodSections = c.sections.filter((s) => s.rate >= 90).length
              const totalStudents = c.sections.reduce((acc, s) => acc + s.studentCount, 0)
              return (
                <div key={c.classId} className="transition-colors">
                  {/* Class header row (clickable) */}
                  <button
                    type="button"
                    onClick={() => setExpandedClass(isExpanded ? null : c.classId)}
                    className="w-full text-left px-6 py-3 hover:bg-accent/40 transition-colors flex items-center gap-3"
                  >
                    <div className={cn(
                      'size-9 rounded-lg grid place-items-center shrink-0 transition-colors',
                      c.rate >= 90 ? 'bg-emerald-500/15 text-emerald-600'
                        : c.rate >= 75 ? 'bg-amber-500/15 text-amber-600'
                          : 'bg-rose-500/15 text-rose-600',
                    )}>
                      <GraduationCap className="size-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{c.className}</p>
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Users className="size-2.5" /> {totalStudents}
                        </Badge>
                        {c.sections.length > 0 && goodSections > 0 && (
                          <Badge variant="outline" className="text-[10px] gap-1 text-emerald-700 dark:text-emerald-400">
                            <CheckCheck className="size-2.5" /> {goodSections}/{c.sections.length} ≥90%
                          </Badge>
                        )}
                      </div>
                      {/* Progress bar */}
                      <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', rateBarClass(c.rate))}
                          style={{ width: `${Math.max(c.rate, 2)}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn('text-sm font-bold tabular-nums px-2 py-0.5 rounded', rateBadgeClass(c.rate))}>
                        {c.rate}%
                      </span>
                      <ChevronDown className={cn(
                        'size-4 text-muted-foreground transition-transform',
                        isExpanded && 'rotate-180',
                      )} />
                    </div>
                  </button>

                  {/* Expanded sections */}
                  {isExpanded && (
                    <div className="px-6 pb-3 pt-1 bg-muted/20 space-y-2">
                      {c.sections.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2 pl-12">No sections in this class.</p>
                      ) : (
                        c.sections.map((sec) => (
                          <div key={sec.sectionId} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
                            <div className={cn(
                              'size-7 rounded-md grid place-items-center shrink-0 text-[11px] font-bold',
                              sec.rate >= 90 ? 'bg-emerald-500/10 text-emerald-600'
                                : sec.rate >= 75 ? 'bg-amber-500/10 text-amber-600'
                                  : 'bg-rose-500/10 text-rose-600',
                            )}>
                              {sec.sectionName.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-medium">Section {sec.sectionName}</p>
                                <span className="text-[10px] text-muted-foreground">{sec.studentCount} students</span>
                                {sec.totalRecords > 0 && (
                                  <span className="text-[10px] text-muted-foreground">· {sec.totalRecords} records</span>
                                )}
                              </div>
                              {/* Mini progress bar */}
                              <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn('h-full rounded-full transition-all duration-500', rateBarClass(sec.rate))}
                                  style={{ width: `${Math.max(sec.rate, 2)}%` }}
                                />
                              </div>
                            </div>
                            <span className={cn('text-xs font-bold tabular-nums px-1.5 py-0.5 rounded shrink-0', rateBadgeClass(sec.rate))}>
                              {sec.rate}%
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
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
// My Attendance — read-only panel for students/parents
// (shown when !can('attendance','mark'); backend scopes records to
// the student's own/children's ids).
// ============================================================
function MyAttendancePanel({ user }: { user: AuthUser }) {
  const isParent = user.role === 'parent'
  const isStudent = user.role === 'student'

  // Linked student ids — student has one, parent has 0..n.
  const studentIds = isStudent && user.studentId
    ? [user.studentId]
    : isParent
      ? user.childrenStudentIds
      : []

  const [activeIdx, setActiveIdx] = useState(0)
  const effectiveIdx = Math.min(activeIdx, Math.max(0, studentIds.length - 1))
  const activeStudentId = studentIds[effectiveIdx] ?? ''

  // For parents with multiple children, fetch visible students (backend
  // already scopes /api/students to own/children) so we can render a child
  // selector dropdown with names.
  const studentsQ = useQuery({
    queryKey: ['students', 'list', 'my-attendance'],
    queryFn: () => api.students.list(),
    enabled: isParent,
  })
  const childOptions = (studentsQ.data ?? []).filter((s) => studentIds.includes(s.id))
  const activeStudent = childOptions.find((s) => s.id === activeStudentId) ?? null

  // Attendance records for the active student.
  const attQ = useQuery({
    queryKey: ['students', activeStudentId, 'attendance'],
    queryFn: () => api.students.attendance(activeStudentId),
    enabled: !!activeStudentId,
  })
  const records: AttendanceRecord[] = attQ.data ?? []

  // Build a 30-day grid ending today.
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const grid: { date: Date; iso: string; status: string | null }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const rec = records.find((r) => r.date.slice(0, 10) === iso)
    grid.push({ date: d, iso, status: rec?.status ?? null })
  }

  const presentCount = grid.filter((g) => g.status === 'Present').length
  const markedCount = grid.filter((g) => g.status !== null).length
  const rate = markedCount ? Math.round((presentCount / markedCount) * 100) : 0

  const recent = [...records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)

  if (!activeStudentId) {
    return (
      <Card>
        <CardContent className="py-2">
          <EmptyState
            icon={UserCheck}
            title="No linked student"
            description="Your account is not linked to a student record. Please contact the school office."
          />
        </CardContent>
      </Card>
    )
  }

  const cellClass = (status: string | null): string => {
    if (status === 'Present') return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
    if (status === 'Absent') return 'bg-rose-500/20 text-rose-700 dark:text-rose-400'
    if (status === 'Late') return 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
    if (status === 'Leave') return 'bg-sky-500/20 text-sky-700 dark:text-sky-400'
    if (status === 'HalfDay') return 'bg-violet-500/20 text-violet-700 dark:text-violet-400'
    return 'bg-muted/60 text-muted-foreground/60'
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
      <div className="lg:col-span-2 space-y-4">
        {/* Rate card + (optional) child selector */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarCheck className="size-4 text-primary" />
                  {isParent ? "My Children's Attendance" : 'My Attendance'}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Last 30 days
                  {activeStudent ? ` · ${activeStudent.fullName}` : ''}
                  {activeStudent?.className ? ` · ${activeStudent.className}` : ''}
                </CardDescription>
              </div>
              {isParent && childOptions.length > 1 && (
                <Select
                  value={activeStudentId}
                  onValueChange={(v) => {
                    const idx = studentIds.indexOf(v)
                    if (idx >= 0) setActiveIdx(idx)
                  }}
                >
                  <SelectTrigger size="sm" className="w-48">
                    <SelectValue placeholder="Select child" />
                  </SelectTrigger>
                  <SelectContent>
                    {childOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {attQ.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex items-end gap-4 flex-wrap">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Attendance Rate</p>
                  <p className={cn(
                    'text-5xl font-bold tabular-nums leading-none',
                    rate >= 90 ? 'text-emerald-600' : rate >= 75 ? 'text-amber-600' : 'text-rose-600',
                  )}>
                    {rate}<span className="text-2xl">%</span>
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Present / Marked</p>
                  <p className="text-lg font-semibold tabular-nums">{presentCount} / {markedCount}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">of last 30 days</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 30-day calendar grid */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" /> Last 30 Days
            </CardTitle>
            <CardDescription className="text-xs">
              <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-500" /> Present</span>
              <span className="mx-1.5">·</span>
              <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-rose-500" /> Absent</span>
              <span className="mx-1.5">·</span>
              <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-amber-500" /> Late</span>
              <span className="mx-1.5">·</span>
              <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-sky-500" /> Leave</span>
              <span className="mx-1.5">·</span>
              <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-violet-500" /> Half Day</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {attQ.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
                {grid.map((g) => (
                  <div
                    key={g.iso}
                    title={`${g.date.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}: ${g.status ?? 'Not marked'}`}
                    className={cn(
                      'aspect-square rounded-md grid place-items-center text-[10px] font-semibold tabular-nums transition-transform hover:scale-105',
                      cellClass(g.status),
                    )}
                  >
                    {g.date.getDate()}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent statuses list */}
      <Card className="lg:col-span-1 h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock3 className="size-4 text-primary" /> Recent Statuses
          </CardTitle>
          <CardDescription className="text-xs">Last 10 attendance entries.</CardDescription>
        </CardHeader>
        <CardContent>
          {attQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState icon={Clock3} title="No records yet" description="Attendance entries will appear here once marked." />
          ) : (
            <div className="max-h-[55vh] overflow-y-auto scroll-thin space-y-1.5 pr-1">
              {recent.map((r) => {
                const meta = STATUS_ORDER.includes(r.status as AttStatus) ? STATUS_META[r.status as AttStatus] : null
                return (
                  <div key={r.id} className="flex items-center gap-2 rounded-lg border px-2.5 py-2">
                    <span className={cn('size-2 rounded-full shrink-0', meta?.dot ?? 'bg-muted-foreground')} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium">{r.status}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{r.method}</span>
                  </div>
                )
              })}
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
  const can = useCan()
  const user = useStore((s) => s.user)
  const canMark = can('attendance', 'mark')

  const summaryQ = useQuery({ queryKey: ['attendance', 'summary'], queryFn: () => api.attendance.summary() })
  const classesQ = useQuery({ queryKey: ['academics', 'classes'], queryFn: api.academics.classes })

  const summary = summaryQ.data

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

      <Tabs defaultValue={canMark ? 'mark' : 'mine'}>
        <TabsList>
          {canMark ? (
            <TabsTrigger value="mark" className="gap-1.5"><CalendarCheck className="size-4" /> Mark Attendance</TabsTrigger>
          ) : (
            <TabsTrigger value="mine" className="gap-1.5"><UserCheck className="size-4" /> {user?.role === 'parent' ? "My Children" : 'My Attendance'}</TabsTrigger>
          )}
          <TabsTrigger value="uhf" className="gap-1.5"><Radio className="size-4" /> UHF / RFID Live</TabsTrigger>
        </TabsList>

        {canMark ? (
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
                <ClassWiseAttendance />
              </div>
            </div>
          </TabsContent>
        ) : (
          <TabsContent value="mine" className="mt-4">
            {user ? <MyAttendancePanel user={user} /> : null}
          </TabsContent>
        )}

        <TabsContent value="uhf" className="mt-4">
          <UhfRfidLive />
        </TabsContent>
      </Tabs>
    </div>
  )
}
