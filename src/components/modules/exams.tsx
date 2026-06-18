'use client'

import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Exam, ExamMark, Student } from '@/lib/types'
import { useCan, useStore } from '@/lib/store'
import { StatCard, SectionHeader, StatusBadge, EmptyState } from '@/components/erp/primitives'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableFooter,
} from '@/components/ui/table'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ClipboardList, CheckCircle2, FileBarChart2, FileText, GraduationCap,
  ChevronRight, CalendarDays, Award, TrendingUp, PieChart as PieChartIcon,
  Download, Sparkles, BookOpen, Trophy, Palette, HeartHandshake, Compass,
  Activity, Percent, Hash, RefreshCw, School, Plus, Pencil, Trash2,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar,
} from 'recharts'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const PIE_COLORS = ['#10b981', '#14b8a6', '#f59e0b', '#f43f5e', '#8b5cf6', '#0ea5e9', '#64748b']

const EXAM_TYPES = ['Unit Test', 'Mid Term', 'Final', 'Online'] as const

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtRange(a: string, b: string): string {
  const d1 = new Date(a)
  const d2 = new Date(b)
  if (d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear()) {
    return `${d1.getDate()}–${d2.getDate()} ${d1.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
  }
  return `${fmtDate(a)} → ${fmtDate(b)}`
}

// ============================================================
// Cell color for an obtained percentage
// ============================================================
function pctColorClass(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold'
  if (pct >= 60) return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold'
  if (pct < 40) return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 font-semibold'
  return 'bg-muted text-foreground font-medium'
}

// ============================================================
// Exam list item (left pane)
// ============================================================
function ExamListItem({
  exam, active, onClick, canEdit, canDelete, onEdit, onDelete,
}: {
  exam: Exam
  active: boolean
  onClick: () => void
  canEdit?: boolean
  canDelete?: boolean
  onEdit?: () => void
  onDelete?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border p-4 transition-all group cursor-pointer',
        active
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border hover:border-primary/40 hover:bg-accent/40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn(
            'size-10 rounded-lg grid place-items-center shrink-0 transition-colors',
            active ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary group-hover:bg-primary/15',
          )}>
            <ClipboardList className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{exam.name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{fmtRange(exam.startDate, exam.endDate)}</p>
          </div>
        </div>
        {active && <ChevronRight className="size-4 text-primary shrink-0 mt-1" />}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        <Badge variant="outline" className="text-[10px] gap-1">
          <BookOpen className="size-3" /> {exam.examType}
        </Badge>
        <StatusBadge status={exam.status} />
        <Badge variant="secondary" className="text-[10px] gap-1 ml-auto">
          <Hash className="size-3" /> {exam.marksCount ?? 0}
        </Badge>
      </div>
      {(canEdit || canDelete) && (
        <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
          {canEdit && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={onEdit}
              title="Edit exam"
            >
              <Pencil className="size-3.5" /> Edit
            </Button>
          )}
          {canDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-500/10"
              onClick={onDelete}
              title="Delete exam"
            >
              <Trash2 className="size-3.5" /> Delete
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Inline editable mark cell
// ============================================================
function EditableMarkCell({
  value, maxMarks, loading, onSave,
}: {
  value: number | null | undefined
  maxMarks: number
  loading?: boolean
  onSave: (obtained: number) => void
}) {
  const [v, setV] = useState(value == null ? '' : String(value))
  return (
    <input
      type="number"
      value={v}
      min={0}
      max={maxMarks}
      disabled={loading}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const raw = v.trim()
        if (raw === '') {
          // empty → treat as 0 only if it changed from a non-null value
          if (value != null) onSave(0)
          return
        }
        const n = Number(raw)
        if (Number.isNaN(n)) return
        if (n === value) return
        onSave(n)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      className="w-14 text-center text-[11px] tabular-nums rounded border border-input bg-card px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
    />
  )
}

// ============================================================
// Marks sheet (pivot table)
// ============================================================
interface PivotRow {
  studentId: string
  studentName: string
  admissionNo: string
  className: string
  cells: Record<string, ExamMark | undefined>
  total: number
  maxTotal: number
  pct: number
}

function MarksSheetTab({
  exam, classId, canEnter,
}: {
  exam: Exam
  classId: string
  canEnter: boolean
}) {
  const user = useStore((s) => s.user)
  const isParent = user?.role === 'parent'
  const childIds = isParent ? (user?.childrenStudentIds ?? []) : []
  const qc = useQueryClient()

  const marksQ = useQuery({
    queryKey: ['exams', 'marks', exam.id, classId],
    queryFn: () => api.exams.marks(exam.id, classId || undefined),
    enabled: !!exam.id,
  })

  const allMarks = marksQ.data ?? []

  // Parent: client-side filter to a single selected child. The backend
  // already scopes the response to all of the parent's children — we just
  // narrow it further to one child for a cleaner per-child view.
  const childrenWithMarks = isParent
    ? childIds
      .map((id) => {
        const m = allMarks.find((r) => r.studentId === id)
        return m ? { id, name: m.studentName } : null
      })
      .filter((x): x is { id: string; name: string } => !!x)
    : []

  const [selectedChildId, setSelectedChildId] = useState<string>('')
  const effectiveChildId = selectedChildId || (childrenWithMarks[0]?.id ?? '')

  const marks = isParent && effectiveChildId
    ? allMarks.filter((m) => m.studentId === effectiveChildId)
    : allMarks

  const { subjects, rows, subjectAverages } = useMemo(() => {
    const subjectSet = new Map<string, { name: string; max: number }>()
    for (const m of marks) {
      if (!subjectSet.has(m.subject)) subjectSet.set(m.subject, { name: m.subject, max: m.maxMarks })
    }
    const subjects = Array.from(subjectSet.values()).sort((a, b) => a.name.localeCompare(b.name))

    const byStudent = new Map<string, PivotRow>()
    for (const m of marks) {
      const existing = byStudent.get(m.studentId)
      const r: PivotRow = existing ?? {
        studentId: m.studentId,
        studentName: m.studentName,
        admissionNo: m.admissionNo,
        className: m.className || '-',
        cells: {},
        total: 0,
        maxTotal: 0,
        pct: 0,
      }
      if (!existing) byStudent.set(m.studentId, r)
      r.cells[m.subject] = m
      if (m.obtained != null) {
        r.total += m.obtained
        r.maxTotal += m.maxMarks
      }
    }
    const rows = Array.from(byStudent.values())
      .map((r) => ({ ...r, pct: r.maxTotal ? Math.round((r.total / r.maxTotal) * 100) : 0 }))
      .sort((a, b) => b.pct - a.pct || a.studentName.localeCompare(b.studentName))

    const subjectAverages = subjects.map((s) => {
      const vals = marks.filter((m) => m.subject === s.name && m.obtained != null)
      const sum = vals.reduce((acc, m) => acc + (m.obtained ?? 0), 0)
      const pct = vals.length ? Math.round((sum / (vals.length * s.max)) * 100) : 0
      return { name: s.name, avg: vals.length ? Math.round((sum / vals.length) * 10) / 10 : 0, pct, count: vals.length }
    })

    return { subjects, rows, subjectAverages }
  }, [marks])

  // Edit mode for marks entry (teachers/admins only)
  const [editMode, setEditMode] = useState(false)

  const enterMarksMut = useMutation({
    mutationFn: (data: { examId: string; studentId: string; subject: string; maxMarks: number; obtained: number }) =>
      api.exams.enterMarks(data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['exams', 'marks', exam.id, classId] })
      qc.invalidateQueries({ queryKey: ['exams', 'list'] })
      toast.success(`Marks saved · ${vars.subject}: ${vars.obtained}/${vars.maxMarks}`)
    },
    onError: (e: any) => toast.error('Failed to save marks: ' + e.message),
  })

  if (marksQ.isLoading) {
    return (
      <Card><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card>
    )
  }
  if (marksQ.isError) {
    return <Card><CardContent className="py-2"><EmptyState icon={RefreshCw} title="Failed to load marks" description="Please retry." /></CardContent></Card>
  }
  if (marks.length === 0) {
    return (
      <Card><CardContent className="py-2">
        <EmptyState icon={FileBarChart2} title="No marks recorded" description="Marks for this exam & class have not been entered yet." />
      </CardContent></Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><FileBarChart2 className="size-4 text-primary" /> Marks Sheet</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {exam.name} · {rows.length} students · {subjects.length} subjects
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[11px] gap-1">
              <Award className="size-3" /> Avg {subjectAverages.length ? Math.round(subjectAverages.reduce((a, s) => a + s.pct, 0) / subjectAverages.length) : 0}%
            </Badge>
            {canEnter && (
              <Button
                size="sm"
                variant={editMode ? 'default' : 'outline'}
                onClick={() => setEditMode((m) => !m)}
                className="h-8 text-xs"
              >
                <Pencil className="size-3.5" />
                {editMode ? 'Done Editing' : 'Edit Mode'}
              </Button>
            )}
          </div>
        </div>
        {isParent && childrenWithMarks.length > 1 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <GraduationCap className="size-3.5" /> Child
            </span>
            <Select value={effectiveChildId} onValueChange={setSelectedChildId}>
              <SelectTrigger size="sm" className="min-w-[220px]">
                <SelectValue placeholder="Select child" />
              </SelectTrigger>
              <SelectContent>
                {childrenWithMarks.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {canEnter && editMode && (
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex items-center gap-2">
            <Sparkles className="size-3.5 text-primary" />
            Click any marks cell to edit. Press <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px]">Enter</kbd> or click away to save.
          </div>
        )}
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="max-h-[60vh] overflow-auto scroll-thin border-t">
          <Table className="min-w-[700px]">
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="pl-6 sticky left-0 bg-card z-20 min-w-[180px]">Student</TableHead>
                {subjects.map((s) => (
                  <TableHead key={s.name} className="text-center min-w-[90px]">
                    <div className="flex flex-col items-center">
                      <span className="text-[11px]">{s.name}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">/{s.max}</span>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-right pr-6 min-w-[100px]">Total</TableHead>
                <TableHead className="text-right pr-6 min-w-[80px]">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.studentId}>
                  <TableCell className="pl-6 sticky left-0 bg-card z-10">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-7 rounded-full bg-primary/10 text-primary grid place-items-center text-[10px] font-bold shrink-0">
                        {r.studentName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{r.studentName}</p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">{r.admissionNo} · {r.className}</p>
                      </div>
                    </div>
                  </TableCell>
                  {subjects.map((s) => {
                    const cell = r.cells[s.name]
                    const obtained = cell?.obtained
                    const pct = cell && cell.maxMarks ? Math.round(((obtained ?? 0) / cell.maxMarks) * 100) : 0
                    if (canEnter && editMode) {
                      return (
                        <TableCell key={s.name} className="text-center">
                          <div className="inline-flex">
                            <EditableMarkCell
                              key={`${r.studentId}-${s.name}-${obtained ?? 'null'}`}
                              value={obtained}
                              maxMarks={s.max}
                              loading={enterMarksMut.isPending}
                              onSave={(newObtained) =>
                                enterMarksMut.mutate({
                                  examId: exam.id,
                                  studentId: r.studentId,
                                  subject: s.name,
                                  maxMarks: s.max,
                                  obtained: newObtained,
                                })
                              }
                            />
                          </div>
                        </TableCell>
                      )
                    }
                    return (
                      <TableCell key={s.name} className="text-center">
                        {cell ? (
                          <span className={cn(
                            'inline-flex items-center justify-center min-w-[44px] px-1.5 py-0.5 rounded text-[11px] tabular-nums',
                            obtained == null ? 'bg-muted/50 text-muted-foreground' : pctColorClass(pct),
                          )} title={cell.grade ? `Grade: ${cell.grade}` : undefined}>
                            {obtained == null ? '—' : obtained}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-right pr-6 font-semibold tabular-nums">
                    {r.total}<span className="text-muted-foreground text-[11px] font-normal">/{r.maxTotal}</span>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <span className={cn(
                      'inline-flex items-center justify-center min-w-[44px] px-1.5 py-0.5 rounded text-[11px] tabular-nums',
                      pctColorClass(r.pct),
                    )}>{r.pct}%</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="sticky bottom-0 bg-muted/40 z-10">
              <TableRow className="border-t font-semibold">
                <TableCell className="pl-6 sticky left-0 bg-muted/40 z-10">
                  <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                    <TrendingUp className="size-3.5" /> Subject Avg
                  </span>
                </TableCell>
                {subjects.map((s) => {
                  const avg = subjectAverages.find((a) => a.name === s.name)
                  const pct = avg?.pct ?? 0
                  return (
                    <TableCell key={s.name} className="text-center">
                      <span className={cn(
                        'inline-flex items-center justify-center min-w-[44px] px-1.5 py-0.5 rounded text-[11px] tabular-nums',
                        pctColorClass(pct),
                      )}>
                        {avg?.avg ?? 0}
                      </span>
                    </TableCell>
                  )
                })}
                <TableCell className="text-right pr-6 text-muted-foreground">—</TableCell>
                <TableCell className="text-right pr-6 text-muted-foreground">—</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Progress card (holistic report card)
// ============================================================
const CO_SCHOLASTIC_AREAS = [
  { key: 'sports', label: 'Sports & Games', icon: Trophy },
  { key: 'arts', label: 'Art & Music', icon: Palette },
  { key: 'behavior', label: 'Behavior & Conduct', icon: HeartHandshake },
  { key: 'lifeSkills', label: 'Life Skills', icon: Compass },
] as const

const CO_GRADES = ['A+', 'A', 'B+', 'B', 'C', 'D'] as const

function ProgressCardTab({
  exam, classId,
}: {
  exam: Exam
  classId: string
}) {
  const marksQ = useQuery({
    queryKey: ['exams', 'marks', exam.id, classId],
    queryFn: () => api.exams.marks(exam.id, classId || undefined),
    enabled: !!exam.id,
  })
  const marks = marksQ.data ?? []

  // Unique students from marks
  const studentsInExam = useMemo(() => {
    const map = new Map<string, { id: string; name: string; admissionNo: string; className: string }>()
    for (const m of marks) {
      if (!map.has(m.studentId)) {
        map.set(m.studentId, { id: m.studentId, name: m.studentName, admissionNo: m.admissionNo, className: m.className || '-' })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [marks])

  // Also fetch full student records (for attendance %, gender, etc.)
  const studentsQ = useQuery({
    queryKey: ['students', 'list', 'progress', classId],
    queryFn: () => api.students.list(classId ? { classId } : {}),
    enabled: !!exam.id,
  })
  const allStudents: Student[] = studentsQ.data ?? []

  const [studentId, setStudentId] = useState<string>('')
  const effectiveStudentId = studentId || (studentsInExam[0]?.id ?? '')
  const studentMeta = studentsInExam.find((s) => s.id === effectiveStudentId) || null
  const studentFull = allStudents.find((s) => s.id === effectiveStudentId) || null

  // Local co-scholastic grades
  const [coGrades, setCoGrades] = useState<Record<string, string>>({
    sports: 'A', arts: 'A+', behavior: 'A+', lifeSkills: 'A',
  })

  const studentMarks = useMemo(
    () => marks.filter((m) => m.studentId === effectiveStudentId),
    [marks, effectiveStudentId],
  )

  const radarData = useMemo(() => {
    return studentMarks.map((m) => ({
      subject: m.subject.length > 8 ? m.subject.slice(0, 8) + '…' : m.subject,
      score: m.maxMarks ? Math.round(((m.obtained ?? 0) / m.maxMarks) * 100) : 0,
      fullMark: 100,
    }))
  }, [studentMarks])

  const totalObtained = studentMarks.reduce((acc, m) => acc + (m.obtained ?? 0), 0)
  const totalMax = studentMarks.reduce((acc, m) => acc + m.maxMarks, 0)
  const overallPct = totalMax ? Math.round((totalObtained / totalMax) * 100) : 0
  const overallGrade = overallPct >= 90 ? 'A+' : overallPct >= 80 ? 'A' : overallPct >= 70 ? 'B+' : overallPct >= 60 ? 'B' : overallPct >= 50 ? 'C' : overallPct >= 40 ? 'D' : 'F'

  const attendancePct = studentFull?.attendancePercent ?? 0

  if (marksQ.isLoading) {
    return <Card><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card>
  }
  if (studentsInExam.length === 0) {
    return (
      <Card><CardContent className="py-2">
        <EmptyState icon={FileText} title="No marks recorded" description="Generate marks for this exam to view progress cards." />
      </CardContent></Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Student selector */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            <span className="text-sm font-medium">Select Student</span>
          </div>
          <Select value={effectiveStudentId} onValueChange={setStudentId}>
            <SelectTrigger size="sm" className="min-w-[260px]">
              <SelectValue placeholder="Choose a student" />
            </SelectTrigger>
            <SelectContent>
              {studentsInExam.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} · {s.admissionNo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Printable progress card */}
      <Card className="overflow-hidden border-primary/20">
        {/* School header */}
        <div className="bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl bg-primary-foreground/15 grid place-items-center">
                <School className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold leading-tight">Vidyamatrix International School</h3>
                <p className="text-xs opacity-90">Holistic Progress Card · Academic Year 2026–27</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-80 uppercase tracking-wide">Examination</p>
              <p className="font-semibold text-sm">{exam.name}</p>
              <p className="text-[11px] opacity-80">{fmtRange(exam.startDate, exam.endDate)}</p>
            </div>
          </div>
        </div>

        {/* Student info */}
        <div className="px-6 py-4 border-b bg-muted/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Student</p>
            <p className="font-semibold">{studentMeta?.name ?? '-'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Admission No.</p>
            <p className="font-semibold tabular-nums">{studentMeta?.admissionNo ?? '-'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Class</p>
            <p className="font-semibold">{studentMeta?.className ?? studentFull?.className ?? '-'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Section</p>
            <p className="font-semibold">{studentFull?.sectionName ?? '-'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* Academic marks table */}
          <div className="lg:col-span-2 p-6 border-b lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="size-4 text-primary" />
              <h4 className="text-sm font-semibold">Scholastic Area</h4>
              <Badge variant="secondary" className="text-[10px] ml-auto">{studentMarks.length} subjects</Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-0">Subject</TableHead>
                  <TableHead className="text-center">Max</TableHead>
                  <TableHead className="text-center">Obtained</TableHead>
                  <TableHead className="text-center">%</TableHead>
                  <TableHead className="text-right pr-0">Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentMarks.map((m) => {
                  const pct = m.maxMarks ? Math.round(((m.obtained ?? 0) / m.maxMarks) * 100) : 0
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="pl-0 font-medium text-sm">{m.subject}</TableCell>
                      <TableCell className="text-center text-xs tabular-nums text-muted-foreground">{m.maxMarks}</TableCell>
                      <TableCell className="text-center text-sm tabular-nums">{m.obtained ?? '—'}</TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          'inline-flex items-center justify-center min-w-[40px] px-1.5 py-0.5 rounded text-[11px] tabular-nums',
                          pctColorClass(pct),
                        )}>{pct}%</span>
                      </TableCell>
                      <TableCell className="text-right pr-0">
                        <Badge variant="outline" className="text-[11px] tabular-nums">{m.grade ?? '-'}</Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="pl-0 font-semibold text-sm" colSpan={2}>Total</TableCell>
                  <TableCell className="text-center font-semibold tabular-nums text-sm">{totalObtained}/{totalMax}</TableCell>
                  <TableCell className="text-center">
                    <span className={cn(
                      'inline-flex items-center justify-center min-w-[40px] px-1.5 py-0.5 rounded text-[11px] tabular-nums',
                      pctColorClass(overallPct),
                    )}>{overallPct}%</span>
                  </TableCell>
                  <TableCell className="text-right pr-0">
                    <Badge className="text-[11px] tabular-nums">{overallGrade}</Badge>
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          {/* Radar chart */}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="size-4 text-primary" />
              <h4 className="text-sm font-semibold">Subject Performance</h4>
            </div>
            {radarData.length === 0 ? (
              <EmptyState icon={Activity} title="No data" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} />
                  <Radar name="Score" dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.35} strokeWidth={2} />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => `${v}%`} />
                </RadarChart>
              </ResponsiveContainer>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg border p-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Attendance</p>
                <p className="font-bold text-lg tabular-nums">{attendancePct}%</p>
              </div>
              <div className="rounded-lg border p-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Overall</p>
                <p className="font-bold text-lg tabular-nums">{overallPct}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Co-scholastic */}
        <div className="p-6 border-t bg-muted/10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="size-4 text-primary" />
            <h4 className="text-sm font-semibold">Co-scholastic Area</h4>
            <span className="text-[11px] text-muted-foreground ml-auto">Graded on a 5-point scale (A+ to D)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CO_SCHOLASTIC_AREAS.map((area) => {
              const Icon = area.icon
              return (
                <div key={area.key} className="rounded-lg border p-3 bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="size-7 rounded-lg bg-primary/10 text-primary grid place-items-center">
                      <Icon className="size-4" />
                    </div>
                    <span className="text-xs font-medium">{area.label}</span>
                  </div>
                  <Select
                    value={coGrades[area.key]}
                    onValueChange={(v) => setCoGrades((prev) => ({ ...prev, [area.key]: v }))}
                  >
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CO_GRADES.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-card flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-muted-foreground">
            <p>This is a system-generated progress card based on examination data.</p>
            <p className="mt-0.5">Generated on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.</p>
          </div>
          <Button
            size="sm"
            onClick={() => toast.success('Generating PDF…', {
              description: `Progress card for ${studentMeta?.name ?? 'student'} is being prepared.`,
            })}
          >
            <Download className="size-4" /> Download PDF
          </Button>
        </div>
      </Card>
    </div>
  )
}

// ============================================================
// Analysis tab
// ============================================================
function AnalysisTab({
  exam, classId,
}: {
  exam: Exam
  classId: string
}) {
  const marksQ = useQuery({
    queryKey: ['exams', 'marks', exam.id, classId],
    queryFn: () => api.exams.marks(exam.id, classId || undefined),
    enabled: !!exam.id,
  })
  const marks = marksQ.data ?? []

  const { subjectAverages, gradeDist } = useMemo(() => {
    // Subject averages
    const bySubject = new Map<string, { sum: number; count: number; max: number }>()
    for (const m of marks) {
      if (m.obtained == null) continue
      const e = bySubject.get(m.subject) || { sum: 0, count: 0, max: m.maxMarks }
      e.sum += m.obtained
      e.count += 1
      e.max = m.maxMarks
      bySubject.set(m.subject, e)
    }
    const subjectAverages = Array.from(bySubject.entries())
      .map(([name, v]) => ({
        subject: name,
        average: v.count ? Math.round((v.sum / v.count) * 10) / 10 : 0,
        pct: v.count ? Math.round((v.sum / (v.count * v.max)) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct)

    // Grade distribution
    const gradeOrder = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F']
    const counts = new Map<string, number>(gradeOrder.map((g) => [g, 0]))
    for (const m of marks) {
      const g = (m.grade || 'N/A').trim()
      if (counts.has(g)) counts.set(g, (counts.get(g) ?? 0) + 1)
    }
    const gradeDist = gradeOrder
      .map((g) => ({ label: g, value: counts.get(g) ?? 0 }))
      .filter((x) => x.value > 0)

    return { subjectAverages, gradeDist }
  }, [marks])

  if (marksQ.isLoading) {
    return <Card><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card>
  }
  if (marksQ.isError) {
    return <Card><CardContent className="py-2"><EmptyState icon={RefreshCw} title="Failed to load analysis" description="Please retry." /></CardContent></Card>
  }
  if (marks.length === 0) {
    return (
      <Card><CardContent className="py-2">
        <EmptyState icon={PieChartIcon} title="No data for analysis" description="Enter marks for this exam to enable analytics." />
      </CardContent></Card>
    )
  }

  const totalMarks = marks.length
  const passedCount = marks.filter((m) => (m.obtained ?? 0) / m.maxMarks >= 0.4).length
  const passRate = totalMarks ? Math.round((passedCount / totalMarks) * 100) : 0
  const classAvg = subjectAverages.length
    ? Math.round(subjectAverages.reduce((a, s) => a + s.pct, 0) / subjectAverages.length)
    : 0

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Entries</p>
          <p className="text-xl font-bold tabular-nums">{totalMarks}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Subjects</p>
          <p className="text-xl font-bold tabular-nums">{subjectAverages.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Class Average</p>
          <p className="text-xl font-bold tabular-nums">{classAvg}%</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pass Rate</p>
          <p className="text-xl font-bold tabular-nums text-emerald-600">{passRate}%</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Subject averages bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" /> Subject-wise Class Averages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={subjectAverages} margin={{ left: -10, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="subject" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" unit="%" />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => `${v}%`} />
                <Bar dataKey="pct" fill="#10b981" radius={[4, 4, 0, 0]} name="Average %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Grade distribution pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChartIcon className="size-4 text-primary" /> Grade Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={gradeDist} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3}>
                  {gradeDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================
// Create / Edit Exam dialog
// ============================================================
function ExamDialog({
  mode, target, loading, onClose, onSubmit,
}: {
  mode: 'create' | 'edit'
  target?: Exam
  loading: boolean
  onClose: () => void
  onSubmit: (data: { name: string; examType: string; startDate: string; endDate: string }) => void
}) {
  const [name, setName] = useState(target?.name ?? '')
  const [examType, setExamType] = useState(target?.examType ?? 'Unit Test')
  const [startDate, setStartDate] = useState(target ? target.startDate.slice(0, 10) : '')
  const [endDate, setEndDate] = useState(target ? target.endDate.slice(0, 10) : '')

  const valid = name.trim() && startDate && endDate && new Date(endDate) >= new Date(startDate)

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="size-5 text-primary" />
            {mode === 'create' ? 'New Exam' : 'Edit Exam'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="exam-name">Exam Name</Label>
            <Input id="exam-name" placeholder="e.g. First Unit Test 2026-27" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Exam Type</Label>
            <Select value={examType} onValueChange={setExamType}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXAM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exam-start">Start Date</Label>
              <Input id="exam-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exam-end">End Date</Label>
              <Input id="exam-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!valid || loading}
            onClick={() => onSubmit({ name: name.trim(), examType, startDate, endDate })}
          >
            {loading ? 'Saving…' : mode === 'create' ? 'Create Exam' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Main module
// ============================================================
export function ExamsModule() {
  const can = useCan()
  const user = useStore((s) => s.user)
  const canEnter = can('exams', 'enter')
  const canCreate = can('exams', 'create')
  const canEdit = can('exams', 'edit')
  const canDelete = can('exams', 'delete')
  const qc = useQueryClient()
  // Students/parents: backend already scopes marks to their own/children's,
  // so the class selector is meaningless for them — hide it.
  const isStudentOrParent = user?.role === 'student' || user?.role === 'parent'

  const examsQ = useQuery({ queryKey: ['exams', 'list'], queryFn: api.exams.list })
  const classesQ = useQuery({ queryKey: ['academics', 'classes'], queryFn: api.academics.classes })

  const exams = examsQ.data ?? []
  const classes = classesQ.data ?? []

  const [selectedId, setSelectedId] = useState<string>('')
  const effectiveSelectedId = selectedId || (exams[0]?.id ?? '')
  const selectedExam = exams.find((e) => e.id === effectiveSelectedId) || null

  const [classId, setClassId] = useState<string>('')
  // For staff: default to first class so the marks sheet is populated.
  // For students/parents: leave empty — the backend scopes by role anyway.
  const effectiveClassId = isStudentOrParent ? '' : (classId || (classes[0]?.id ?? ''))

  // CRUD state
  const [examDialog, setExamDialog] = useState<{ mode: 'create' | 'edit'; target?: Exam } | null>(null)
  const [examDelete, setExamDelete] = useState<Exam | null>(null)

  const createExamMut = useMutation({
    mutationFn: (data: { name: string; examType: string; startDate: string; endDate: string }) => api.exams.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exams', 'list'] }); toast.success('Exam created'); setExamDialog(null) },
    onError: (e: any) => toast.error('Failed to create exam: ' + e.message),
  })
  const updateExamMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; examType: string; startDate: string; endDate: string } }) => api.exams.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exams', 'list'] }); toast.success('Exam updated'); setExamDialog(null) },
    onError: (e: any) => toast.error('Failed to update exam: ' + e.message),
  })
  const deleteExamMut = useMutation({
    mutationFn: (id: string) => api.exams.remove(id),
    onSuccess: (_d, deletedId) => {
      qc.invalidateQueries({ queryKey: ['exams', 'list'] })
      toast.success('Exam deleted')
      setExamDelete(null)
      if (effectiveSelectedId === deletedId) setSelectedId('')
    },
    onError: (e: any) => toast.error('Failed to delete exam: ' + e.message),
  })

  // Total stats
  const totalExams = exams.length
  const completedExams = exams.filter((e) => e.status === 'Completed').length
  const totalMarksEntered = exams.reduce((acc, e) => acc + (e.marksCount ?? 0), 0)

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Examinations & Results"
        description="Manage exam schedules, enter marks, generate holistic progress cards, and analyse performance."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Exams"
          value={totalExams}
          sub="Across all academic years"
          icon={ClipboardList}
          accent="primary"
          loading={examsQ.isLoading}
        />
        <StatCard
          label="Completed Exams"
          value={completedExams}
          sub="Results published"
          icon={CheckCircle2}
          accent="emerald"
          loading={examsQ.isLoading}
        />
        <StatCard
          label="Marks Entered"
          value={totalMarksEntered}
          sub="Across all exams"
          icon={FileBarChart2}
          accent="violet"
          loading={examsQ.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Left: exams list */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold flex items-center gap-2"><ClipboardList className="size-4 text-primary" /> Examinations</h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[11px]">{exams.length}</Badge>
              {canCreate && (
                <Button size="sm" className="h-8 text-xs" onClick={() => setExamDialog({ mode: 'create' })}>
                  <Plus className="size-3.5" /> New Exam
                </Button>
              )}
            </div>
          </div>

          {examsQ.isLoading ? (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto scroll-thin pr-1">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : examsQ.isError ? (
            <Card><CardContent className="py-2"><EmptyState icon={RefreshCw} title="Failed to load exams" description="Please retry." /></CardContent></Card>
          ) : exams.length === 0 ? (
            <Card><CardContent className="py-2"><EmptyState icon={ClipboardList} title="No exams scheduled" description="Create exams in the academic setup to view them here." /></CardContent></Card>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto scroll-thin pr-1">
              {exams.map((e) => (
                <ExamListItem
                  key={e.id}
                  exam={e}
                  active={effectiveSelectedId === e.id}
                  onClick={() => setSelectedId(e.id)}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={() => setExamDialog({ mode: 'edit', target: e })}
                  onDelete={() => setExamDelete(e)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: detail pane */}
        <div className="lg:col-span-2">
          {!selectedExam ? (
            <Card className="h-full grid place-items-center">
              <CardContent className="py-2">
                <EmptyState icon={ClipboardList} title="Select an exam" description="Pick an exam from the left to view marks, progress cards, and analysis." />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Exam header + class selector */}
              <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-xl bg-primary text-primary-foreground grid place-items-center">
                      <ClipboardList className="size-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-base">{selectedExam.name}</p>
                      <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                        <CalendarDays className="size-3" /> {fmtRange(selectedExam.startDate, selectedExam.endDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1 text-[11px]"><BookOpen className="size-3" /> {selectedExam.examType}</Badge>
                    <StatusBadge status={selectedExam.status} />
                    <Badge variant="secondary" className="text-[11px] gap-1"><Hash className="size-3" /> {selectedExam.marksCount ?? 0}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                    <GraduationCap className="size-3.5" /> Class
                  </span>
                  {isStudentOrParent ? (
                    <span className="text-xs text-muted-foreground italic">
                      {user?.role === 'parent' ? "Scoped to your children" : 'Scoped to your record'}
                    </span>
                  ) : (
                    <Select value={effectiveClassId} onValueChange={setClassId}>
                      <SelectTrigger size="sm" className="w-44">
                        <SelectValue placeholder="All classes" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {canEnter && (
                    <Badge variant="outline" className="ml-auto text-[10px] gap-1 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="size-3" /> Can enter marks
                    </Badge>
                  )}
                </div>
              </Card>

              <Tabs defaultValue="marks">
                <TabsList>
                  <TabsTrigger value="marks" className="gap-1.5"><FileBarChart2 className="size-4" /> Marks Sheet</TabsTrigger>
                  <TabsTrigger value="progress" className="gap-1.5"><FileText className="size-4" /> Progress Card</TabsTrigger>
                  <TabsTrigger value="analysis" className="gap-1.5"><Percent className="size-4" /> Analysis</TabsTrigger>
                </TabsList>

                <TabsContent value="marks" className="mt-4">
                  <MarksSheetTab exam={selectedExam} classId={effectiveClassId} canEnter={canEnter} />
                </TabsContent>

                <TabsContent value="progress" className="mt-4">
                  <ProgressCardTab exam={selectedExam} classId={effectiveClassId} />
                </TabsContent>

                <TabsContent value="analysis" className="mt-4">
                  <AnalysisTab exam={selectedExam} classId={effectiveClassId} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {examDialog && (
        <ExamDialog
          mode={examDialog.mode}
          target={examDialog.target}
          loading={createExamMut.isPending || updateExamMut.isPending}
          onClose={() => setExamDialog(null)}
          onSubmit={(data) => {
            if (examDialog.mode === 'edit' && examDialog.target) {
              updateExamMut.mutate({ id: examDialog.target.id, data })
            } else {
              createExamMut.mutate(data)
            }
          }}
        />
      )}

      {examDelete && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setExamDelete(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete exam?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <strong>{examDelete.name}</strong> ({examDelete.examType}, {fmtRange(examDelete.startDate, examDelete.endDate)}) along with all marks entered for it. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => deleteExamMut.mutate(examDelete.id)}
                disabled={deleteExamMut.isPending}
              >
                {deleteExamMut.isPending ? 'Deleting…' : 'Yes, delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
