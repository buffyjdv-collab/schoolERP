'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ClassInfo, TimetableSlot } from '@/lib/types'
import { SectionHeader, EmptyState } from '@/components/erp/primitives'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  GraduationCap, Users, BookOpen, Layers, School, Clock, MapPin,
  UserCircle2, CalendarDays, Search, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

// ============ Left pane: classes list ============
function ClassListItem({
  cls, active, onClick,
}: {
  cls: ClassInfo
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border p-4 transition-all group',
        active
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border hover:border-primary/40 hover:bg-accent/40'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'size-10 rounded-lg grid place-items-center shrink-0 transition-colors',
            active ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary group-hover:bg-primary/15'
          )}>
            <GraduationCap className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{cls.name}</p>
            <p className="text-[11px] text-muted-foreground">{cls.sections.length} section{cls.sections.length !== 1 ? 's' : ''} · {cls.subjectCount} subjects</p>
          </div>
        </div>
        {active && <ChevronRight className="size-4 text-primary shrink-0 mt-1" />}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Users className="size-3" /> {cls.studentCount} students</span>
        <span className="inline-flex items-center gap-1"><Layers className="size-3" /> {cls.sections.length} sec</span>
        <span className="inline-flex items-center gap-1"><BookOpen className="size-3" /> {cls.subjectCount} sub</span>
      </div>
    </button>
  )
}

// ============ Sections & Subjects tab ============
function SectionsSubjectsTab({ cls }: { cls: ClassInfo }) {
  return (
    <div className="space-y-6">
      {/* Sections grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Layers className="size-4 text-primary" /> Sections</h3>
          <Badge variant="secondary" className="text-[11px]">{cls.sections.length} section{cls.sections.length !== 1 ? 's' : ''}</Badge>
        </div>
        {cls.sections.length === 0 ? (
          <EmptyState icon={Layers} title="No sections" description="No sections have been created for this class yet." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {cls.sections.map((s) => {
              const util = s.capacity ? Math.round((s.studentCount / s.capacity) * 100) : 0
              return (
                <Card key={s.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center font-bold text-sm">
                        {s.name}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{cls.name} · Section {s.name}</p>
                        <p className="text-[11px] text-muted-foreground">Capacity {s.capacity}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground inline-flex items-center gap-1.5"><Users className="size-3.5" /> Students</span>
                      <span className="font-semibold tabular-nums">{s.studentCount} / {s.capacity}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          util >= 90 ? 'bg-rose-500' : util >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                        )}
                        style={{ width: `${Math.min(util, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-muted-foreground inline-flex items-center gap-1.5"><UserCircle2 className="size-3.5" /> Class Teacher</span>
                      <span className="font-medium text-right truncate max-w-[60%]">{s.teacherName || 'Not assigned'}</span>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Subjects table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><BookOpen className="size-4 text-primary" /> Subjects</h3>
          <Badge variant="secondary" className="text-[11px]">{cls.subjects.length} subject{cls.subjects.length !== 1 ? 's' : ''}</Badge>
        </div>
        <Card className="p-0 overflow-hidden">
          {cls.subjects.length === 0 ? (
            <div className="p-6"><EmptyState icon={BookOpen} title="No subjects" description="No subjects have been mapped to this class yet." /></div>
          ) : (
            <div className="max-h-[40vh] overflow-y-auto scroll-thin">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="pl-6">Subject</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="pr-6">Faculty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cls.subjects.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="pl-6 font-medium text-sm">{s.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[11px] tabular-nums">{s.code}</Badge></TableCell>
                      <TableCell className="pr-6 text-sm">
                        {s.teacherName ? (
                          <span className="inline-flex items-center gap-1.5">
                            <UserCircle2 className="size-3.5 text-muted-foreground" />
                            {s.teacherName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Not assigned</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

// ============ Timetable grid ============
function TimetableGrid({
  slots, className, sectionName, sectionSelector,
}: {
  slots: TimetableSlot[]
  className: string
  sectionName: string
  sectionSelector: React.ReactNode
}) {
  // Index by day + period for fast lookup. If multiple sections contribute,
  // the first one wins (cells display the chosen section's slot).
  const byKey = new Map<string, TimetableSlot>()
  for (const s of slots) {
    const k = `${s.day}|${s.period}`
    if (!byKey.has(k)) byKey.set(k, s)
  }

  const periods = Array.from(new Set(slots.map((s) => s.period))).sort((a, b) => a - b)
  const presentDays = DAYS.filter((d) => slots.some((s) => s.day === d))

  if (periods.length === 0) {
    return (
      <Card>
        <CardContent className="py-2">
          <EmptyState icon={CalendarDays} title="No timetable published" description={`The weekly timetable for ${className}${sectionName ? ` · Section ${sectionName}` : ''} has not been generated yet.`} />
        </CardContent>
      </Card>
    )
  }

  // Period time range from first occurrence
  const timeFor = (p: number) => {
    const slot = slots.find((s) => s.period === p)
    return slot ? `${slot.startTime}–${slot.endTime}` : ''
  }

  return (
    <Card className="p-0 overflow-hidden">
      <CardHeader className="pb-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="size-4 text-primary" /> Weekly Timetable · {className}{sectionName && <span className="text-muted-foreground font-normal">· Section {sectionName}</span>}</CardTitle>
          {sectionSelector}
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="max-h-[60vh] overflow-auto scroll-thin">
          <Table className="min-w-[900px]">
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="pl-4 sticky left-0 bg-card z-20 min-w-[110px]">Period</TableHead>
                {presentDays.map((d) => (
                  <TableHead key={d} className="text-center min-w-[140px]">{d.slice(0, 3)}<span className="hidden md:inline"> — {d.slice(3)}</span></TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.map((p) => (
                <TableRow key={p}>
                  <TableCell className="pl-4 sticky left-0 bg-card z-10 align-top">
                    <div className="font-semibold text-sm">P{p}</div>
                    <div className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">{timeFor(p)}</div>
                  </TableCell>
                  {presentDays.map((d) => {
                    const slot = byKey.get(`${d}|${p}`)
                    return (
                      <TableCell key={d} className="align-top p-2">
                        {slot ? (
                          <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 hover:border-primary/40 transition-colors">
                            <p className="font-semibold text-sm text-primary truncate">{slot.subjectName}</p>
                            <p className="text-[11px] text-muted-foreground truncate inline-flex items-center gap-1 mt-0.5">
                              <UserCircle2 className="size-3" /> {slot.teacherName}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                              {slot.room && <span className="inline-flex items-center gap-0.5"><MapPin className="size-3" />{slot.room}</span>}
                              <span className="inline-flex items-center gap-0.5"><Clock className="size-3" />{slot.startTime}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-border/60 p-2.5 text-center">
                            <span className="text-[11px] text-muted-foreground/60">—</span>
                          </div>
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// ============ Main module ============
export function AcademicsModule() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState('sections')
  const [q, setQ] = useState('')
  const [sectionFilter, setSectionFilter] = useState<string>('all')

  const classesQ = useQuery({ queryKey: ['academics', 'classes'], queryFn: api.academics.classes })
  const classes = classesQ.data ?? []

  const filtered = q
    ? classes.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
    : classes

  // Effect-free auto-selection: pick first class if none chosen yet.
  // (Set-state-in-effect rule does not apply because we never mutate state here.)
  const selected = classes.find((c) => c.id === selectedId) || null
  const effectiveSelected = selected || (classes.length > 0 ? classes[0] : null)

  // Reset section filter when class changes (only if the current filter is no longer valid)
  const activeClass = effectiveSelected
  const validSections = activeClass?.sections ?? []
  const effectiveSectionFilter =
    sectionFilter === 'all' || validSections.some((s) => s.id === sectionFilter)
      ? sectionFilter
      : 'all'

  const timetableQ = useQuery({
    queryKey: ['academics', 'timetable', effectiveSelected?.id, effectiveSectionFilter],
    queryFn: () =>
      api.academics.timetable(
        effectiveSelected!.id,
        effectiveSectionFilter === 'all' ? undefined : effectiveSectionFilter,
      ),
    enabled: !!effectiveSelected && tab === 'timetable',
  })

  const activeSectionObj = validSections.find((s) => s.id === effectiveSectionFilter) || null

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Academic Setup"
        description="Manage classes, sections, subjects and weekly timetable."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Left pane — classes list */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold flex items-center gap-2"><School className="size-4 text-primary" /> Classes</h3>
            <Badge variant="secondary" className="text-[11px]">{classes.length}</Badge>
          </div>
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search class…"
              className="pl-9"
            />
          </div>

          {classesQ.isLoading ? (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto scroll-thin pr-1">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-2"><EmptyState icon={School} title="No classes found" description={q ? 'Try a different search.' : 'No classes have been set up yet.'} /></CardContent></Card>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto scroll-thin pr-1">
              {filtered.map((c) => (
                <ClassListItem
                  key={c.id}
                  cls={c}
                  active={(effectiveSelected?.id) === c.id}
                  onClick={() => { setSelectedId(c.id); setSectionFilter('all'); setTab('sections') }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right pane — tabs */}
        <div className="lg:col-span-2">
          {!effectiveSelected ? (
            <Card className="h-full grid place-items-center">
              <CardContent className="py-2">
                <EmptyState icon={GraduationCap} title="Select a class" description="Pick a class from the left to view its sections, subjects and weekly timetable." />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Class header summary */}
              <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-xl bg-primary text-primary-foreground grid place-items-center">
                      <GraduationCap className="size-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-base">{effectiveSelected.name}</p>
                      <p className="text-xs text-muted-foreground">Academic Year 2026–27</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-bold tabular-nums">{effectiveSelected.studentCount}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Students</p>
                    </div>
                    <div className="size-8 border-l" />
                    <div className="text-center">
                      <p className="font-bold tabular-nums">{effectiveSelected.sections.length}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Sections</p>
                    </div>
                    <div className="size-8 border-l" />
                    <div className="text-center">
                      <p className="font-bold tabular-nums">{effectiveSelected.subjectCount}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Subjects</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                  <TabsTrigger value="sections" className="gap-1.5"><Layers className="size-4" /> Sections &amp; Subjects</TabsTrigger>
                  <TabsTrigger value="timetable" className="gap-1.5"><CalendarDays className="size-4" /> Timetable</TabsTrigger>
                </TabsList>

                <TabsContent value="sections" className="mt-4">
                  <SectionsSubjectsTab cls={effectiveSelected} />
                </TabsContent>

                <TabsContent value="timetable" className="mt-4">
                  {timetableQ.isLoading ? (
                    <Card><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card>
                  ) : timetableQ.isError ? (
                    <Card><CardContent className="py-2"><EmptyState icon={CalendarDays} title="Failed to load timetable" description="Please try again later." /></CardContent></Card>
                  ) : (
                    <TimetableGrid
                      slots={timetableQ.data ?? []}
                      className={effectiveSelected.name}
                      sectionName={activeSectionObj?.name ?? ''}
                      sectionSelector={
                        <Select value={effectiveSectionFilter} onValueChange={setSectionFilter}>
                          <SelectTrigger size="sm" className="w-44">
                            <SelectValue placeholder="All sections" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All sections</SelectItem>
                            {validSections.map((s) => (
                              <SelectItem key={s.id} value={s.id}>Section {s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      }
                    />
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
