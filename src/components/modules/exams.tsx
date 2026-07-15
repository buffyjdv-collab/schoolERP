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
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  ClipboardList, CheckCircle2, FileBarChart2, FileText, GraduationCap,
  ChevronRight, CalendarDays, Award, TrendingUp, PieChart as PieChartIcon,
  Download, Sparkles, BookOpen, Trophy, Palette, HeartHandshake, Compass,
  Activity, Percent, Hash, RefreshCw, School, Plus, Pencil, Trash2,
  Upload, X, AlertCircle, Users, Lock, Save, Eye, FileCheck2,
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

function pctColorClass(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold'
  if (pct >= 60) return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold'
  if (pct < 40) return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 font-semibold'
  return 'bg-muted text-foreground font-medium'
}

function gradeFor(pct: number): string {
  return pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F'
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
        {exam.subject && (
          <Badge variant="outline" className="text-[10px] gap-1">
            <FileText className="size-3" /> {exam.subject}
          </Badge>
        )}
        {exam.maxMarks != null && (
          <Badge variant="outline" className="text-[10px] gap-1">
            <Award className="size-3" /> {exam.maxMarks}
          </Badge>
        )}
        <StatusBadge status={exam.status} />
        <Badge variant="secondary" className="text-[10px] gap-1 ml-auto">
          <Hash className="size-3" /> {exam.marksCount ?? 0}
        </Badge>
      </div>
      {(canEdit || canDelete) && (
        <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
          {canEdit && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onEdit} title="Edit exam">
              <Pencil className="size-3.5" /> Edit
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-500/10" onClick={onDelete} title="Delete exam">
              <Trash2 className="size-3.5" /> Delete
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Pivot row interface
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

// ============================================================
// Modern Student Progress Sheet (right-side drawer)
// Admin + class teacher only. Shows only when ALL subjects' marks entered.
// Downloadable.
// ============================================================
function StudentProgressSheet({
  exam, student, studentFull, marks, allSubjectsCount, open, onOpenChange, canDownload,
}: {
  exam: Exam
  student: { id: string; name: string; admissionNo: string; className: string } | null
  studentFull: Student | null
  marks: ExamMark[]
  allSubjectsCount: number
  open: boolean
  onOpenChange: (v: boolean) => void
  canDownload: boolean
}) {
  const studentMarks = useMemo(
    () => (student ? marks.filter((m) => m.studentId === student.id) : []),
    [marks, student],
  )

  const allSubjectsEntered = allSubjectsCount > 0 && studentMarks.length >= allSubjectsCount

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
  const overallGrade = gradeFor(overallPct)
  const attendancePct = studentFull?.attendancePercent ?? 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto scroll-thin p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Student Progress Report</SheetTitle>
          <SheetDescription>
            Holistic progress report for {student?.name ?? 'student'} in {exam.name}.
          </SheetDescription>
        </SheetHeader>

        {!student ? (
          <div className="p-6"><EmptyState icon={FileText} title="No student selected" /></div>
        ) : !allSubjectsEntered ? (
          <div className="p-6">
            <EmptyState
              icon={Lock}
              title="Progress card locked"
              description={`Marks for all ${allSubjectsCount} subjects must be entered before the progress card can be viewed. Currently ${studentMarks.length} of ${allSubjectsCount} subjects have marks.`}
            />
          </div>
        ) : (
          <div className="overflow-hidden">
            {/* Modern gradient header */}
            <div className="relative bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white p-6 overflow-hidden">
              <div className="absolute -top-12 -right-12 size-40 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-8 -left-8 size-32 rounded-full bg-white/5 blur-xl" />
              <div className="relative flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-2xl bg-white/20 backdrop-blur grid place-items-center shadow-lg">
                    <School className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold leading-tight">Vidyamatrix International School</h3>
                    <p className="text-xs opacity-90">Holistic Progress Card · Academic Year 2026–27</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] opacity-80 uppercase tracking-wider">Examination</p>
                  <p className="font-semibold text-sm">{exam.name}</p>
                  <p className="text-[11px] opacity-80">{fmtRange(exam.startDate, exam.endDate)}</p>
                </div>
              </div>
            </div>

            {/* Student info strip */}
            <div className="px-6 py-4 border-b bg-muted/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Student</p>
                <p className="font-semibold">{student.name}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Admission No.</p>
                <p className="font-semibold tabular-nums">{student.admissionNo}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Class</p>
                <p className="font-semibold">{student.className || studentFull?.className || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Section</p>
                <p className="font-semibold">{studentFull?.sectionName ?? '-'}</p>
              </div>
            </div>

            {/* Overall summary tiles */}
            <div className="px-6 pt-5 grid grid-cols-3 gap-3">
              <div className="rounded-xl border bg-gradient-to-br from-emerald-500/10 to-transparent p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Overall %</p>
                <p className={cn('text-2xl font-bold tabular-nums', overallPct >= 40 ? 'text-emerald-600' : 'text-rose-600')}>{overallPct}%</p>
              </div>
              <div className="rounded-xl border bg-gradient-to-br from-amber-500/10 to-transparent p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Grade</p>
                <p className="text-2xl font-bold tabular-nums">{overallGrade}</p>
              </div>
              <div className="rounded-xl border bg-gradient-to-br from-sky-500/10 to-transparent p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Attendance</p>
                <p className="text-2xl font-bold tabular-nums">{attendancePct}%</p>
              </div>
            </div>

            {/* Scholastic + Radar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
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
                            <span className={cn('inline-flex items-center justify-center min-w-[40px] px-1.5 py-0.5 rounded text-[11px] tabular-nums', pctColorClass(pct))}>{pct}%</span>
                          </TableCell>
                          <TableCell className="text-right pr-0">
                            <Badge variant="outline" className="text-[11px] tabular-nums">{m.grade ?? gradeFor(pct)}</Badge>
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
                        <span className={cn('inline-flex items-center justify-center min-w-[40px] px-1.5 py-0.5 rounded text-[11px] tabular-nums', pctColorClass(overallPct))}>{overallPct}%</span>
                      </TableCell>
                      <TableCell className="text-right pr-0">
                        <Badge className="text-[11px] tabular-nums">{overallGrade}</Badge>
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>

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
              </div>
            </div>

            {/* Footer with download (only for admin/class teacher) */}
            <div className="p-6 border-t bg-card flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
                <FileCheck2 className="size-3.5 shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <p>All {allSubjectsCount} subjects' marks have been entered for this student.</p>
                  <p className="mt-0.5">Generated on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.</p>
                </div>
              </div>
              {canDownload && (
                <Button
                  size="sm"
                  onClick={() => toast.success('Generating PDF…', { description: `Progress card for ${student.name} is being prepared.` })}
                >
                  <Download className="size-4" /> Download PDF
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ============================================================
// Marks sheet — batch entry (no auto-save). Save All button.
// ============================================================
function MarksSheetTab({
  exam, classId, sectionId, canEnter, onOpenProgress,
}: {
  exam: Exam
  classId: string
  sectionId?: string
  canEnter: boolean
  onOpenProgress: (studentId: string) => void
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

  // Load students for the class (+section) — needed for entry rows + section filtering
  const studentsQ = useQuery({
    queryKey: ['students', 'class', classId, sectionId ?? 'all'],
    queryFn: () => api.students.list({ classId, ...(sectionId ? { sectionId } : {}) }),
    enabled: !!classId,
  })

  const allMarks = marksQ.data ?? []
  const sectionStudents = studentsQ.data ?? []
  const sectionStudentIds = useMemo(
    () => new Set(sectionStudents.map((s) => s.id)),
    [sectionStudents],
  )

  // Parent: client-side filter to a single selected child
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

  // Effective marks: parent → child; staff+section → section students; else all
  const marks: ExamMark[] = isParent && effectiveChildId
    ? allMarks.filter((m) => m.studentId === effectiveChildId)
    : sectionId && sectionStudentIds.size > 0
      ? allMarks.filter((m) => sectionStudentIds.has(m.studentId))
      : allMarks

  const examMax = typeof exam.maxMarks === 'number' && exam.maxMarks > 0 ? exam.maxMarks : 100

  const { subjects, rows, subjectAverages } = useMemo(() => {
    const subjectSet = new Map<string, { name: string; max: number }>()
    for (const m of marks) {
      if (!subjectSet.has(m.subject)) subjectSet.set(m.subject, { name: m.subject, max: m.maxMarks || examMax })
    }
    // Seed with the exam's subject if no marks exist
    if (subjectSet.size === 0 && exam.subject) {
      subjectSet.set(exam.subject, { name: exam.subject, max: examMax })
    }
    const subjects = Array.from(subjectSet.values()).sort((a, b) => a.name.localeCompare(b.name))

    const byStudent = new Map<string, PivotRow>()
    // Always seed rows from the section student list so entry rows persist
    for (const s of sectionStudents) {
      byStudent.set(s.id, {
        studentId: s.id, studentName: s.fullName, admissionNo: s.admissionNo,
        className: s.className || '-', cells: {}, total: 0, maxTotal: 0, pct: 0,
      })
    }
    // Fold in existing marks
    for (const m of marks) {
      const existing = byStudent.get(m.studentId)
      const r: PivotRow = existing ?? {
        studentId: m.studentId, studentName: m.studentName, admissionNo: m.admissionNo,
        className: m.className || '-', cells: {}, total: 0, maxTotal: 0, pct: 0,
      }
      if (!existing) byStudent.set(m.studentId, r)
      r.cells[m.subject] = m
      // Use the subject's max from the exam (not m.maxMarks which may be stale=100)
      const subjMax = subjectSet.get(m.subject)?.max ?? m.maxMarks ?? examMax
      if (m.obtained != null) { r.total += m.obtained; r.maxTotal += subjMax }
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
  }, [marks, exam.subject, examMax, sectionStudents])

  // ---- Batch entry state (no auto-save) ----
  // draftMarks: { [studentId]: { [subject]: string } } — local input values
  const [draftMarks, setDraftMarks] = useState<Record<string, Record<string, string>>>({})
  const [editMode, setEditMode] = useState(false)

  // Reset draft when exam/section changes
  const [prevKey, setPrevKey] = useState(`${exam.id}-${sectionId ?? 'all'}`)
  const currentKey = `${exam.id}-${sectionId ?? 'all'}`
  if (prevKey !== currentKey) {
    setPrevKey(currentKey)
    setDraftMarks({})
    setEditMode(false)
  }

  // Initialize draft from existing marks when entering edit mode
  const enterEditMode = () => {
    const init: Record<string, Record<string, string>> = {}
    for (const r of rows) {
      init[r.studentId] = {}
      for (const s of subjects) {
        const cell = r.cells[s.name]
        init[r.studentId][s.name] = cell?.obtained != null ? String(cell.obtained) : ''
      }
    }
    setDraftMarks(init)
    setEditMode(true)
  }

  const setDraft = (studentId: string, subject: string, value: string) => {
    setDraftMarks((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [subject]: value },
    }))
  }

  // Count how many students have ALL subjects filled (for the Save All hint)
  const entryStats = useMemo(() => {
    let complete = 0
    let partial = 0
    for (const r of rows) {
      const d = draftMarks[r.studentId]
      if (!d) continue
      const filled = subjects.filter((s) => d[s.name] != null && d[s.name].trim() !== '').length
      if (filled === subjects.length && subjects.length > 0) complete++
      else if (filled > 0) partial++
    }
    return { complete, partial, total: rows.length }
  }, [draftMarks, rows, subjects])

  const canSaveAll = editMode && entryStats.complete > 0

  const batchSaveMut = useMutation({
    mutationFn: async () => {
      // Save each subject's marks in parallel
      const promises = subjects.map((s) => {
        const entries = rows
          .map((r) => {
            const raw = draftMarks[r.studentId]?.[s.name]
            if (raw == null || raw.trim() === '') return null
            const n = Number(raw)
            if (Number.isNaN(n)) return null
            return { studentId: r.studentId, obtained: n }
          })
          .filter((x): x is { studentId: string; obtained: number } => x !== null)
        if (entries.length === 0) return null
        return api.exams.batchSaveMarks({ examId: exam.id, subject: s.name, maxMarks: s.max, entries })
      })
      return Promise.all(promises.filter(Boolean))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams', 'marks', exam.id, classId] })
      qc.invalidateQueries({ queryKey: ['exams', 'list'] })
      toast.success(`Marks saved for ${entryStats.complete} students`)
      setEditMode(false)
      setDraftMarks({})
    },
    onError: (e: any) => toast.error('Failed to save marks: ' + e.message),
  })

  if (marksQ.isLoading || (!!sectionId && studentsQ.isLoading)) {
    return <Card><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card>
  }
  if (marksQ.isError) {
    return <Card><CardContent className="py-2"><EmptyState icon={RefreshCw} title="Failed to load marks" description="Please retry." /></CardContent></Card>
  }
  if (sectionId && !studentsQ.isLoading && sectionStudents.length === 0) {
    return (
      <Card><CardContent className="py-2">
        <EmptyState icon={Users} title="No students in this section" description="The selected section does not have any students enrolled yet." />
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
              {exam.name} · {rows.length} students · {subjects.length} subject(s)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {subjects.length > 0 && (
              <Badge variant="secondary" className="text-[11px] gap-1">
                <Award className="size-3" /> Avg {subjectAverages.length ? Math.round(subjectAverages.reduce((a, s) => a + s.pct, 0) / subjectAverages.length) : 0}%
              </Badge>
            )}
            {canEnter && (
              editMode ? (
                <>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setEditMode(false); setDraftMarks({}) }}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    disabled={!canSaveAll || batchSaveMut.isPending}
                    onClick={() => batchSaveMut.mutate()}
                  >
                    <Save className="size-3.5" />
                    {batchSaveMut.isPending ? 'Saving…' : `Save All (${entryStats.complete})`}
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={enterEditMode}>
                  <Pencil className="size-3.5" /> Enter Marks
                </Button>
              )
            )}
          </div>
        </div>
        {isParent && childrenWithMarks.length > 1 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <GraduationCap className="size-3.5" /> Child
            </span>
            <Select value={effectiveChildId} onValueChange={setSelectedChildId}>
              <SelectTrigger size="sm" className="min-w-[220px]"><SelectValue placeholder="Select child" /></SelectTrigger>
              <SelectContent>
                {childrenWithMarks.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {canEnter && editMode && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <Sparkles className="size-3.5 text-primary" />
              <span className="text-muted-foreground">Enter marks for all students, then click <strong>Save All</strong>. Marks are NOT saved until you click Save.</span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <Badge variant="outline" className="gap-1 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-3" /> {entryStats.complete} ready
              </Badge>
              {entryStats.partial > 0 && (
                <Badge variant="outline" className="gap-1 text-amber-700 dark:text-amber-400">
                  <AlertCircle className="size-3" /> {entryStats.partial} partial
                </Badge>
              )}
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <Hash className="size-3" /> {entryStats.total} total
              </Badge>
            </div>
          </div>
        )}
        {!canEnter && marks.length === 0 && (
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex items-center gap-2">
            <Lock className="size-3.5" />
            Marks entry is locked. The exam status must be "Completed" to enter marks.
          </div>
        )}
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {rows.length === 0 ? (
          <div className="py-8">
            <EmptyState icon={FileBarChart2} title="No students found" description="No students match the current class/section filter." />
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-auto scroll-thin border-t">
            <Table className="min-w-[700px]">
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="pl-6 sticky left-0 bg-card z-20 min-w-[180px]">Student</TableHead>
                  {subjects.map((s) => (
                    <TableHead key={s.name} className="text-center min-w-[100px]">
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] font-medium">{s.name}</span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">Max: {s.max}</span>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-right pr-6 min-w-[100px]">Total</TableHead>
                  <TableHead className="text-right pr-6 min-w-[80px]">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.studentId} className="group/row">
                    <TableCell className="pl-6 sticky left-0 bg-card z-10">
                      <button
                        type="button"
                        onClick={() => onOpenProgress(r.studentId)}
                        className="flex items-center gap-2.5 min-w-0 text-left rounded-md p-0.5 -m-0.5 hover:bg-accent/60 transition-colors w-full"
                        title="Click to view progress card"
                      >
                        <div className="size-7 rounded-full bg-primary/10 text-primary grid place-items-center text-[10px] font-bold shrink-0">
                          {r.studentName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate inline-flex items-center gap-1">
                            {r.studentName}
                            <Eye className="size-3 text-muted-foreground/0 group-hover/row:text-primary transition-colors" />
                          </p>
                          <p className="text-[11px] text-muted-foreground tabular-nums">{r.admissionNo} · {r.className}</p>
                        </div>
                      </button>
                    </TableCell>
                    {subjects.map((s) => {
                      const cell = r.cells[s.name]
                      const obtained = cell?.obtained
                      // Always use the subject's max (from exam.maxMarks) — not the
                      // cell's maxMarks which may be stale (100) from old data.
                      const pct = s.max ? Math.round(((obtained ?? 0) / s.max) * 100) : 0
                      if (canEnter && editMode) {
                        const draftVal = draftMarks[r.studentId]?.[s.name] ?? ''
                        return (
                          <TableCell key={s.name} className="text-center">
                            <input
                              type="number"
                              value={draftVal}
                              min={0}
                              max={s.max}
                              placeholder="—"
                              onChange={(e) => setDraft(r.studentId, s.name, e.target.value)}
                              className="w-16 text-center text-[11px] tabular-nums rounded-md border border-input bg-card px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                            />
                          </TableCell>
                        )
                      }
                      return (
                        <TableCell key={s.name} className="text-center">
                          {cell && obtained != null ? (
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <span className={cn(
                                'inline-flex items-center justify-center min-w-[48px] px-1.5 py-0.5 rounded text-[11px] tabular-nums font-semibold',
                                pctColorClass(pct),
                              )} title={cell.grade ? `Grade: ${cell.grade}` : undefined}>
                                {obtained}/{s.max}
                              </span>
                              <span className="text-[9px] text-muted-foreground tabular-nums">{pct}%</span>
                            </div>
                          ) : cell ? (
                            <span className="text-muted-foreground/40 text-xs">—</span>
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
              {subjects.length > 0 && marks.length > 0 && (
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
              )}
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// Analysis tab
// ============================================================
function AnalysisTab({ exam, classId }: { exam: Exam; classId: string }) {
  const marksQ = useQuery({
    queryKey: ['exams', 'marks', exam.id, classId],
    queryFn: () => api.exams.marks(exam.id, classId || undefined),
    enabled: !!exam.id,
  })
  const marks = marksQ.data ?? []

  const { subjectAverages, gradeDist } = useMemo(() => {
    const bySubject = new Map<string, { sum: number; count: number; max: number }>()
    for (const m of marks) {
      if (m.obtained == null) continue
      const e = bySubject.get(m.subject) || { sum: 0, count: 0, max: m.maxMarks }
      e.sum += m.obtained; e.count += 1; e.max = m.maxMarks
      bySubject.set(m.subject, e)
    }
    const subjectAverages = Array.from(bySubject.entries())
      .map(([name, v]) => ({ subject: name, average: v.count ? Math.round((v.sum / v.count) * 10) / 10 : 0, pct: v.count ? Math.round((v.sum / (v.count * v.max)) * 100) : 0 }))
      .sort((a, b) => b.pct - a.pct)
    const gradeOrder = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F']
    const counts = new Map<string, number>(gradeOrder.map((g) => [g, 0]))
    for (const m of marks) {
      const g = (m.grade || 'N/A').trim()
      if (counts.has(g)) counts.set(g, (counts.get(g) ?? 0) + 1)
    }
    const gradeDist = gradeOrder.map((g) => ({ label: g, value: counts.get(g) ?? 0 })).filter((x) => x.value > 0)
    return { subjectAverages, gradeDist }
  }, [marks])

  if (marksQ.isLoading) return <Card><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card>
  if (marksQ.isError) return <Card><CardContent className="py-2"><EmptyState icon={RefreshCw} title="Failed to load analysis" description="Please retry." /></CardContent></Card>
  if (marks.length === 0) return <Card><CardContent className="py-2"><EmptyState icon={PieChartIcon} title="No data for analysis" description="Enter marks for this exam to enable analytics." /></CardContent></Card>

  const totalMarks = marks.length
  const passedCount = marks.filter((m) => (m.obtained ?? 0) / m.maxMarks >= 0.4).length
  const passRate = totalMarks ? Math.round((passedCount / totalMarks) * 100) : 0
  const classAvg = subjectAverages.length ? Math.round(subjectAverages.reduce((a, s) => a + s.pct, 0) / subjectAverages.length) : 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Entries</p><p className="text-xl font-bold tabular-nums">{totalMarks}</p></Card>
        <Card className="p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Subjects</p><p className="text-xl font-bold tabular-nums">{subjectAverages.length}</p></Card>
        <Card className="p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Class Average</p><p className="text-xl font-bold tabular-nums">{classAvg}%</p></Card>
        <Card className="p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pass Rate</p><p className="text-xl font-bold tabular-nums text-emerald-600">{passRate}%</p></Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingUp className="size-4 text-primary" /> Subject-wise Class Averages</CardTitle></CardHeader>
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
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><PieChartIcon className="size-4 text-primary" /> Grade Distribution</CardTitle></CardHeader>
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
  mode, target, loading, onClose, onSubmit, classes,
}: {
  mode: 'create' | 'edit'
  target?: Exam
  loading: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  classes: any[]
}) {
  const [name, setName] = useState(target?.name ?? '')
  const [examType, setExamType] = useState(target?.examType ?? 'Unit Test')
  const [startDate, setStartDate] = useState(target ? target.startDate.slice(0, 10) : '')
  const [endDate, setEndDate] = useState(target ? target.endDate.slice(0, 10) : '')
  const [classId, setClassId] = useState(target?.classId ?? '')
  const [subject, setSubject] = useState(target?.subject ?? '')
  const [paperUrl, setPaperUrl] = useState(target?.paperUrl ?? '')
  const [maxMarks, setMaxMarks] = useState<number>(target?.maxMarks ?? 100)

  const selectedClass = classes.find((c) => c.id === classId)
  const classSubjects = selectedClass?.subjects ?? []

  const valid = name.trim() && startDate && endDate && new Date(endDate) >= new Date(startDate) && maxMarks > 0

  const handlePaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPaperUrl(`/uploads/exam-papers/${file.name}`)
      toast.success(`Paper uploaded: ${file.name}`)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto scroll-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="size-5 text-primary" />
            {mode === 'create' ? 'New Exam' : 'Edit Exam'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="exam-name">Exam Name *</Label>
            <Input id="exam-name" placeholder="e.g. First Unit Test - Mathematics" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Class *</Label>
              <Select value={classId} onValueChange={(v) => { setClassId(v); setSubject('') }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subject *</Label>
              {classSubjects.length > 0 ? (
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {classSubjects.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input placeholder="Select class first" disabled />
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Exam Type</Label>
              <Select value={examType} onValueChange={setExamType}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXAM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exam-maxmarks">Max Marks</Label>
              <Input id="exam-maxmarks" type="number" min={1} step={1} value={maxMarks} onChange={(e) => setMaxMarks(Math.max(1, Number(e.target.value) || 0))} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value="Scheduled" disabled>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

          <div className="space-y-1.5">
            <Label>Question Paper (optional)</Label>
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer">
                <div className="flex items-center justify-center gap-2 h-10 rounded-md border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-sm text-muted-foreground">
                  <Upload className="size-4" />
                  {paperUrl ? paperUrl.split('/').pop() : 'Click to upload question paper'}
                </div>
                <input type="file" accept=".pdf,.doc,.docx,.jpg,.png" className="hidden" onChange={handlePaperUpload} />
              </label>
              {paperUrl && (
                <Button size="sm" variant="ghost" onClick={() => setPaperUrl('')}>
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {mode === 'create' && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
            <AlertCircle className="size-4 text-sky-600 shrink-0 mt-0.5" />
            <p className="text-xs text-sky-700 dark:text-sky-400">
              New exams are created with status <strong>Scheduled</strong>. After the exam is conducted, update the status to <strong>Ongoing</strong> or <strong>Completed</strong> from the side panel to enable marks entry.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!valid || !classId || !subject || loading}
            onClick={() => onSubmit({ name: name.trim(), examType, startDate, endDate, classId, subject, paperUrl, maxMarks })}
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
  const isStudentOrParent = user?.role === 'student' || user?.role === 'parent'
  // Only admin and the class teacher (who teaches the exam's class) can view/download progress cards
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const isTeacher = user?.role === 'teacher'

  const examsQ = useQuery({ queryKey: ['exams', 'list'], queryFn: api.exams.list })
  const classesQ = useQuery({ queryKey: ['academics', 'classes'], queryFn: api.academics.classes })

  const exams = examsQ.data ?? []
  const classes = classesQ.data ?? []

  const [selectedId, setSelectedId] = useState<string>('')
  const effectiveSelectedId = selectedId || (exams[0]?.id ?? '')
  const selectedExam = exams.find((e) => e.id === effectiveSelectedId) || null

  // Use the exam's classId directly (no manual class selector)
  const effectiveClassId = selectedExam?.classId || ''

  // Section selector — staff only. Reset when exam changes.
  const [selectedSectionId, setSelectedSectionId] = useState<string>('')
  const [prevExamId, setPrevExamId] = useState(effectiveSelectedId)
  if (effectiveSelectedId !== prevExamId) {
    setPrevExamId(effectiveSelectedId)
    setSelectedSectionId('')
  }

  const selectedClass = classes.find((c) => c.id === selectedExam?.classId)
  const examSections = selectedClass?.sections ?? []
  const canPickSection = !isStudentOrParent && examSections.length > 0

  // Progress sheet state
  const [progressStudentId, setProgressStudentId] = useState<string | null>(null)

  // CRUD state
  const [examDialog, setExamDialog] = useState<{ mode: 'create' | 'edit'; target?: Exam } | null>(null)
  const [examDelete, setExamDelete] = useState<Exam | null>(null)

  const createExamMut = useMutation({
    mutationFn: (data: any) => api.exams.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exams', 'list'] }); toast.success('Exam created'); setExamDialog(null) },
    onError: (e: any) => toast.error('Failed to create exam: ' + e.message),
  })
  const updateExamMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.exams.update(id, data),
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

  // Quick status update from the side panel
  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.exams.update(id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exams', 'list'] }); toast.success('Exam status updated') },
    onError: (e: any) => toast.error('Failed to update status: ' + e.message),
  })

  // Load marks + students for the selected exam (for progress card lookup)
  const marksQ = useQuery({
    queryKey: ['exams', 'marks', selectedExam?.id, effectiveClassId],
    queryFn: () => api.exams.marks(selectedExam!.id, effectiveClassId || undefined),
    enabled: !!selectedExam,
  })
  const studentsQ = useQuery({
    queryKey: ['students', 'class', effectiveClassId, 'progress'],
    queryFn: () => api.students.list({ classId: effectiveClassId }),
    enabled: !!selectedExam && !!effectiveClassId,
  })

  const allMarks = marksQ.data ?? []
  const allStudents = studentsQ.data ?? []

  // All subjects for the exam's class (used for "all subjects entered" check)
  // If the exam has a specific subject, the count is 1 (just that subject).
  // Otherwise, use the class's subject count.
  const allSubjectsCount = selectedExam?.subject
    ? 1
    : (selectedClass?.subjects?.length ?? 0)

  // Determine if the current user can view/download progress cards:
  // admin/super_admin → yes; teacher → only if they teach the exam's class
  const canViewProgress = isAdmin || (isTeacher && selectedExam?.classId
    ? (user?.teacherClassIds ?? []).includes(selectedExam.classId)
    : false)

  // Build progress student meta
  const progressStudentMeta = progressStudentId
    ? (() => {
        const r = allMarks.find((m) => m.studentId === progressStudentId)
        const s = allStudents.find((st) => st.id === progressStudentId)
        if (r) return { id: r.studentId, name: r.studentName, admissionNo: r.admissionNo, className: r.className || '-' }
        if (s) return { id: s.id, name: s.fullName, admissionNo: s.admissionNo, className: s.className || '-' }
        return null
      })()
    : null
  const progressStudentFull = progressStudentId
    ? allStudents.find((s) => s.id === progressStudentId) ?? null
    : null

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
        <StatCard label="Total Exams" value={totalExams} sub="Across all academic years" icon={ClipboardList} accent="primary" loading={examsQ.isLoading} />
        <StatCard label="Completed Exams" value={completedExams} sub="Results published" icon={CheckCircle2} accent="emerald" loading={examsQ.isLoading} />
        <StatCard label="Marks Entered" value={totalMarksEntered} sub="Across all exams" icon={FileBarChart2} accent="violet" loading={examsQ.isLoading} />
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
            <Card><CardContent className="py-2"><EmptyState icon={ClipboardList} title="No exams scheduled" description="Create a new exam to get started." /></CardContent></Card>
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
              {/* Exam header + status selector */}
              <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                <div className="flex flex-wrap items-start justify-between gap-3">
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="gap-1 text-[11px]"><BookOpen className="size-3" /> {selectedExam.examType}</Badge>
                    {selectedClass && (
                      <Badge variant="outline" className="gap-1 text-[11px]"><GraduationCap className="size-3" /> {selectedClass.name}</Badge>
                    )}
                    {selectedExam.subject && (
                      <Badge variant="outline" className="gap-1 text-[11px]"><FileText className="size-3" /> {selectedExam.subject}</Badge>
                    )}
                    {selectedExam.maxMarks != null && (
                      <Badge variant="outline" className="gap-1 text-[11px]"><Award className="size-3" /> Max {selectedExam.maxMarks}</Badge>
                    )}
                    <Badge variant="secondary" className="text-[11px] gap-1"><Hash className="size-3" /> {selectedExam.marksCount ?? 0}</Badge>
                    {selectedExam.paperUrl && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => toast.info('Downloading question paper…')}>
                        <Download className="size-3" /> Paper
                      </Button>
                    )}
                  </div>
                </div>

                {/* Status selector row */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                    <Activity className="size-3.5" /> Status
                  </span>
                  {canEdit ? (
                    <Select
                      value={selectedExam.status}
                      onValueChange={(v) => statusMut.mutate({ id: selectedExam.id, status: v })}
                      disabled={statusMut.isPending}
                    >
                      <SelectTrigger size="sm" className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                        <SelectItem value="Ongoing">Ongoing</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <StatusBadge status={selectedExam.status} />
                  )}
                  {canEnter && selectedExam.status === 'Completed' && (
                    <Badge variant="outline" className="ml-auto text-[10px] gap-1 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="size-3" /> Marks entry unlocked
                    </Badge>
                  )}
                  {canEnter && selectedExam.status !== 'Completed' && (
                    <Badge variant="outline" className="ml-auto text-[10px] gap-1 text-amber-700 dark:text-amber-400">
                      <AlertCircle className="size-3" /> Set to Completed to enter marks
                    </Badge>
                  )}
                </div>

                {/* Section selector row — staff only */}
                {canPickSection && (
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                      <Users className="size-3.5" /> Section
                    </span>
                    <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                      <SelectTrigger size="sm" className="min-w-[200px]"><SelectValue placeholder="All Sections" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All Sections</SelectItem>
                        {examSections.map((sec) => (
                          <SelectItem key={sec.id} value={sec.id}>{sec.name} · {sec.studentCount ?? 0} students</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedSectionId && selectedSectionId !== '__all__' && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Users className="size-3" />
                        {examSections.find((s) => s.id === selectedSectionId)?.name ?? 'Section'}
                      </Badge>
                    )}
                    {canEnter && selectedExam.status === 'Completed' && !selectedSectionId && (
                      <span className="text-[11px] text-muted-foreground ml-auto">Tip: pick a section to enter marks for only those students.</span>
                    )}
                  </div>
                )}
              </Card>

              <Tabs defaultValue="marks">
                <TabsList>
                  <TabsTrigger value="marks" className="gap-1.5"><FileBarChart2 className="size-4" /> Marks Sheet</TabsTrigger>
                  <TabsTrigger value="analysis" className="gap-1.5"><Percent className="size-4" /> Analysis</TabsTrigger>
                </TabsList>

                <TabsContent value="marks" className="mt-4">
                  <MarksSheetTab
                    key={`${selectedExam.id}-${selectedSectionId || 'all'}`}
                    exam={selectedExam}
                    classId={effectiveClassId}
                    sectionId={selectedSectionId && selectedSectionId !== '__all__' ? selectedSectionId : undefined}
                    canEnter={canEnter && selectedExam.status === 'Completed'}
                    onOpenProgress={canViewProgress ? (sid) => setProgressStudentId(sid) : () => {}}
                  />
                </TabsContent>

                <TabsContent value="analysis" className="mt-4">
                  <AnalysisTab exam={selectedExam} classId={effectiveClassId} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* Progress card sheet */}
      {selectedExam && (
        <StudentProgressSheet
          exam={selectedExam}
          student={progressStudentMeta}
          studentFull={progressStudentFull}
          marks={allMarks}
          allSubjectsCount={allSubjectsCount}
          open={progressStudentId !== null}
          onOpenChange={(v) => { if (!v) setProgressStudentId(null) }}
          canDownload={canViewProgress}
        />
      )}

      {examDialog && (
        <ExamDialog
          mode={examDialog.mode}
          target={examDialog.target}
          loading={createExamMut.isPending || updateExamMut.isPending}
          onClose={() => setExamDialog(null)}
          classes={classes}
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
