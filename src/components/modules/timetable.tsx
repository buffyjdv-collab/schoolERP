'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { SectionHeader, EmptyState } from '@/components/erp/primitives'
import type { TimetableSlot } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CalendarDays, Clock, MapPin, User, Download, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useCan } from '@/lib/store'
import { cn } from '@/lib/utils'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const PERIODS = [
  { n: 1, time: '08:00 - 08:45' },
  { n: 2, time: '08:45 - 09:30' },
  { n: 3, time: '09:30 - 10:15' },
  { n: 4, time: '10:30 - 11:15', label: 'Break after' },
  { n: 5, time: '11:15 - 12:00' },
  { n: 6, time: '12:00 - 12:45', label: 'Lunch after' },
  { n: 7, time: '01:30 - 02:15' },
  { n: 8, time: '02:15 - 03:00' },
]

const SUBJECT_COLORS: Record<string, string> = {
  English: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  Hindi: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
  Mathematics: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  Science: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  Physics: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
  Chemistry: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  Biology: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  'Social Studies': 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  'Computer Science': 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
  Art: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
  'Physical Education': 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  Music: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
}

// Helper to extract start/end times from a PERIOD definition
function periodTimes(period: number): { startTime: string; endTime: string } {
  const p = PERIODS.find((x) => x.n === period)
  if (!p) return { startTime: '08:00', endTime: '08:45' }
  const [start, end] = p.time.split(' - ')
  return { startTime: start, endTime: end }
}

export function TimetableModule() {
  const canCreate = useCan()('academics', 'create')
  const canDelete = useCan()('academics', 'delete')
  const qc = useQueryClient()

  const [classId, setClassId] = useState<string>('')
  const [sectionId, setSectionId] = useState<string>('all')

  // CRUD state
  const [addTarget, setAddTarget] = useState<{ day: string; period: number } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TimetableSlot | null>(null)

  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: api.academics.classes })
  const selectedClass = classes?.find(c => c.id === classId)
  const { data: slots, isLoading } = useQuery({
    queryKey: ['timetable', classId, sectionId],
    queryFn: () => api.academics.timetable(classId, sectionId === 'all' ? undefined : sectionId),
    enabled: !!classId,
  })

  const addSlotMut = useMutation({
    mutationFn: (data: any) => api.academics.addSlot(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timetable', classId, sectionId] })
      toast.success('Timetable slot added')
      setAddTarget(null)
    },
    onError: (e: any) => toast.error('Failed to add slot: ' + e.message),
  })

  const deleteSlotMut = useMutation({
    mutationFn: (id: string) => api.academics.deleteSlot(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timetable', classId, sectionId] })
      toast.success('Timetable slot deleted')
      setDeleteTarget(null)
    },
    onError: (e: any) => toast.error('Failed to delete slot: ' + e.message),
  })

  // Build grid: day x period
  const grid: Record<string, Record<number, TimetableSlot[]>> = {}
  DAYS.forEach(d => { grid[d] = {} })
  ;(slots || []).forEach(s => {
    if (!grid[s.day][s.period]) grid[s.day][s.period] = []
    grid[s.day][s.period].push(s)
  })

  const addModeActive = canCreate && !!classId && !!addTarget

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Weekly Timetable"
        description="Class-wise weekly schedule with auto-generation conflict detection"
        action={
          <div className="flex items-center gap-2">
            {canCreate && classId && (
              <Button
                size="sm"
                variant={addModeActive ? 'default' : 'outline'}
                onClick={() => addTarget ? setAddTarget(null) : setAddTarget({ day: 'Monday', period: 1 })}
              >
                <Plus className="size-4 mr-1.5" /> {addModeActive ? 'Cancel Add' : 'Add Slot'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => toast.info('Exporting timetable as PDF…')}><Download className="size-4 mr-1.5" /> Export PDF</Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger className="w-full sm:w-52 h-10"><CalendarDays className="size-4 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>{classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            {selectedClass && (
              <Select value={sectionId} onValueChange={setSectionId}>
                <SelectTrigger className="w-full sm:w-40 h-10"><SelectValue placeholder="Section" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {selectedClass.sections.map(s => <SelectItem key={s.id} value={s.id}>Section {s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {selectedClass && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
                <Badge variant="outline">{selectedClass.subjectCount} subjects</Badge>
                <Badge variant="outline">{selectedClass.studentCount} students</Badge>
              </div>
            )}
          </div>

          {canCreate && classId && addModeActive && (
            <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/30 text-xs text-foreground flex items-center gap-2">
              <Plus className="size-4 text-primary" />
              <span><strong>Add mode active:</strong> click any empty cell (—) in the grid below to open the slot dialog.</span>
            </div>
          )}

          {!classId ? (
            <EmptyState icon={CalendarDays} title="Select a class" description="Choose a class above to view its weekly timetable." />
          ) : isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full border-collapse min-w-[800px]">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 bg-card border border-border p-2 text-xs font-semibold text-left w-28">Day / Period</th>
                    {PERIODS.map(p => (
                      <th key={p.n} className="border border-border p-2 text-xs font-semibold min-w-[120px]">
                        <div className="flex flex-col items-center gap-0.5">
                          <span>Period {p.n}</span>
                          <span className="text-[10px] font-normal text-muted-foreground flex items-center gap-0.5"><Clock className="size-2.5" />{p.time}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map(day => (
                    <tr key={day}>
                      <td className="sticky left-0 z-10 bg-card border border-border p-2 text-xs font-semibold">{day}</td>
                      {PERIODS.map(p => {
                        const cell = grid[day][p.n]
                        if (!cell || !cell.length) {
                          // Empty cell — clickable to add slot when canCreate and a class is selected
                          if (canCreate && classId) {
                            return (
                              <td key={p.n} className="border border-border p-1.5">
                                <button
                                  type="button"
                                  onClick={() => setAddTarget({ day, period: p.n })}
                                  className={cn(
                                    'h-16 w-full rounded bg-muted/30 grid place-items-center text-[10px] text-muted-foreground/50 transition-colors',
                                    'hover:bg-primary/10 hover:text-primary hover:border-primary/40 border border-transparent',
                                  )}
                                  title={`Add slot · ${day} · Period ${p.n}`}
                                >
                                  {addModeActive ? <Plus className="size-4" /> : '—'}
                                </button>
                              </td>
                            )
                          }
                          return <td key={p.n} className="border border-border p-1.5"><div className="h-16 rounded bg-muted/30 grid place-items-center text-[10px] text-muted-foreground/50">—</div></td>
                        }
                        const s = cell[0]
                        const colorClass = SUBJECT_COLORS[s.subjectName] || 'bg-muted text-muted-foreground border-border'
                        const clickable = canDelete
                        return (
                          <td key={p.n} className="border border-border p-1.5 align-top">
                            {clickable ? (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(s)}
                                className={cn(
                                  'h-16 w-full rounded-md border p-1.5 flex flex-col justify-between text-left transition-all',
                                  colorClass,
                                  'hover:ring-2 hover:ring-rose-400/50 hover:border-rose-400/50 cursor-pointer',
                                )}
                                title="Click to view details / delete"
                              >
                                <div className="text-xs font-semibold leading-tight truncate w-full">{s.subjectName}</div>
                                <div className="text-[10px] space-y-0.5 opacity-90">
                                  <div className="flex items-center gap-0.5 truncate"><User className="size-2.5 shrink-0" />{s.teacherName}</div>
                                  {s.room && <div className="flex items-center gap-0.5 truncate"><MapPin className="size-2.5 shrink-0" />{s.room}</div>}
                                </div>
                              </button>
                            ) : (
                              <div className={cn('h-16 rounded-md border p-1.5 flex flex-col justify-between', colorClass)}>
                                <div className="text-xs font-semibold leading-tight truncate">{s.subjectName}</div>
                                <div className="text-[10px] space-y-0.5 opacity-90">
                                  <div className="flex items-center gap-0.5 truncate"><User className="size-2.5 shrink-0" />{s.teacherName}</div>
                                  {s.room && <div className="flex items-center gap-0.5 truncate"><MapPin className="size-2.5 shrink-0" />{s.room}</div>}
                                </div>
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card><CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-3">Subject Legend</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SUBJECT_COLORS).map(([subj, cls]) => (
            <span key={subj} className={`text-[11px] px-2 py-1 rounded-md border ${cls}`}>{subj}</span>
          ))}
        </div>
      </CardContent></Card>

      {/* Add Slot Dialog */}
      {addTarget && classId && (
        <AddSlotDialog
          day={addTarget.day}
          period={addTarget.period}
          sectionId={sectionId === 'all' ? undefined : sectionId}
          sections={selectedClass?.sections ?? []}
          loading={addSlotMut.isPending}
          onClose={() => setAddTarget(null)}
          onSubmit={(data) => addSlotMut.mutate({ ...data, classId })}
        />
      )}

      {/* Delete Slot AlertDialog (with slot details) */}
      {deleteTarget && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Timetable slot</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <p>Delete this slot? This action cannot be undone.</p>
                  <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1.5">
                    <div className="flex items-center justify-between"><span className="text-muted-foreground inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />Day · Period</span><span className="font-medium">{deleteTarget.day} · Period {deleteTarget.period}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground inline-flex items-center gap-1.5"><Clock className="size-3.5" />Time</span><span className="font-medium tabular-nums">{deleteTarget.startTime} – {deleteTarget.endTime}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground inline-flex items-center gap-1.5"><User className="size-3.5" />Subject</span><span className="font-medium">{deleteTarget.subjectName}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground inline-flex items-center gap-1.5"><User className="size-3.5" />Teacher</span><span className="font-medium">{deleteTarget.teacherName}</span></div>
                    {deleteTarget.room && (
                      <div className="flex items-center justify-between"><span className="text-muted-foreground inline-flex items-center gap-1.5"><MapPin className="size-3.5" />Room</span><span className="font-medium">{deleteTarget.room}</span></div>
                    )}
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Class</span><span className="font-medium">{deleteTarget.className}{deleteTarget.sectionName && deleteTarget.sectionName !== '-' ? ` · ${deleteTarget.sectionName}` : ''}</span></div>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => deleteSlotMut.mutate(deleteTarget.id)}
                disabled={deleteSlotMut.isPending}
              >
                {deleteSlotMut.isPending ? 'Deleting…' : (
                  <span className="inline-flex items-center gap-1.5"><Trash2 className="size-4" /> Delete slot</span>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

// ============================================================
// Add Slot Dialog — pre-fills day + period; user enters the rest.
// ============================================================
function AddSlotDialog({
  day, period, sectionId, sections, loading, onClose, onSubmit,
}: {
  day: string
  period: number
  sectionId?: string
  sections: { id: string; name: string }[]
  loading: boolean
  onClose: () => void
  onSubmit: (data: {
    sectionId?: string
    day: string
    period: number
    subjectName: string
    teacherName: string
    room: string
    startTime: string
    endTime: string
  }) => void
}) {
  const defaults = periodTimes(period)
  const [subjectName, setSubjectName] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [room, setRoom] = useState('')
  const [startTime, setStartTime] = useState(defaults.startTime)
  const [endTime, setEndTime] = useState(defaults.endTime)
  const [chosenSectionId, setChosenSectionId] = useState<string>(sectionId ?? '')

  const valid = subjectName.trim() && teacherName.trim() && startTime && endTime

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-5 text-primary" /> Add Timetable Slot
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Pre-filled day + period */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Day</Label>
              <div className="h-9 px-3 rounded-md border bg-muted/40 grid items-center text-sm font-medium">{day}</div>
            </div>
            <div className="space-y-1.5">
              <Label>Period</Label>
              <div className="h-9 px-3 rounded-md border bg-muted/40 grid items-center text-sm font-medium">Period {period} · {defaults.startTime}–{defaults.endTime}</div>
            </div>
          </div>

          {/* Optional section selector (only when "All Sections" was the view) */}
          {!sectionId && sections.length > 0 && (
            <div className="space-y-1.5">
              <Label>Section (optional)</Label>
              <Select value={chosenSectionId || '__all__'} onValueChange={(v) => setChosenSectionId(v === '__all__' ? '' : v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="All sections" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All sections</SelectItem>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>Section {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="slot-subject">Subject</Label>
            <Input id="slot-subject" placeholder="e.g. Mathematics" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slot-teacher">Teacher</Label>
            <Input id="slot-teacher" placeholder="e.g. Ms. Priya Sharma" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slot-room">Room (optional)</Label>
            <Input id="slot-room" placeholder="e.g. R-204" value={room} onChange={(e) => setRoom(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="slot-start">Start Time</Label>
              <Input id="slot-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slot-end">End Time</Label>
              <Input id="slot-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!valid || loading}
            onClick={() => onSubmit({
              ...(chosenSectionId ? { sectionId: chosenSectionId } : {}),
              day,
              period,
              subjectName: subjectName.trim(),
              teacherName: teacherName.trim(),
              room: room.trim(),
              startTime,
              endTime,
            })}
          >
            {loading ? 'Adding…' : 'Add Slot'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
