'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { SectionHeader, EmptyState } from '@/components/erp/primitives'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Clock, MapPin, User, Download } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

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

export function TimetableModule() {
  const [classId, setClassId] = useState<string>('')
  const [sectionId, setSectionId] = useState<string>('all')

  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: api.academics.classes })
  const selectedClass = classes?.find(c => c.id === classId)
  const { data: slots, isLoading } = useQuery({
    queryKey: ['timetable', classId, sectionId],
    queryFn: () => api.academics.timetable(classId, sectionId === 'all' ? undefined : sectionId),
    enabled: !!classId,
  })

  // Build grid: day x period
  const grid: Record<string, Record<number, typeof slots>> = {}
  DAYS.forEach(d => { grid[d] = {} })
  ;(slots || []).forEach(s => {
    if (!grid[s.day][s.period]) grid[s.day][s.period] = [] as any
    ;(grid[s.day][s.period] as any).push(s)
  })

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Weekly Timetable"
        description="Class-wise weekly schedule with auto-generation conflict detection"
        action={<Button variant="outline" size="sm" onClick={() => toast.info('Exporting timetable as PDF…')}><Download className="size-4 mr-1.5" /> Export PDF</Button>}
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
                        if (!cell || !cell.length) return <td key={p.n} className="border border-border p-1.5"><div className="h-16 rounded bg-muted/30 grid place-items-center text-[10px] text-muted-foreground/50">—</div></td>
                        const s = cell[0]
                        const colorClass = SUBJECT_COLORS[s.subjectName] || 'bg-muted text-muted-foreground border-border'
                        return (
                          <td key={p.n} className="border border-border p-1.5 align-top">
                            <div className={`h-16 rounded-md border p-1.5 flex flex-col justify-between ${colorClass}`}>
                              <div className="text-xs font-semibold leading-tight truncate">{s.subjectName}</div>
                              <div className="text-[10px] space-y-0.5 opacity-90">
                                <div className="flex items-center gap-0.5 truncate"><User className="size-2.5 shrink-0" />{s.teacherName}</div>
                                {s.room && <div className="flex items-center gap-0.5 truncate"><MapPin className="size-2.5 shrink-0" />{s.room}</div>}
                              </div>
                            </div>
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
    </div>
  )
}
