'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { StatCard, SectionHeader, StatusBadge, EmptyState } from '@/components/erp/primitives'
import type { Student, FeeInvoice, ExamMark, AttendanceRecord, ClassInfo } from '@/lib/types'
import {
  Users, UserPlus, Search, Download, Filter, GraduationCap, Phone, Mail, MapPin,
  Calendar, Droplet, Heart, Briefcase, Bus, X, Shield, Award, TrendingUp, TrendingDown, IdCard,
  Pencil, Trash2, Route as RouteIcon, Navigation, UserCheck, Wallet,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts'
import { useStore, useCan } from '@/lib/store'

function initials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

export function StudentsModule() {
  const { searchQuery, user } = useStore()
  const canCreate = useCan()('students', 'create')
  const [localSearch, setLocalSearch] = useState('')
  const [classFilter, setClassFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const qc = useQueryClient()
  const q = localSearch || searchQuery
  const role = user?.role
  const isStudent = role === 'student'
  const isParent = role === 'parent'
  const isRestricted = isStudent || isParent  // no search/filters/institution-stats

  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: api.academics.classes })
  const { data: students, isLoading } = useQuery({
    queryKey: ['students', q, classFilter, statusFilter, user?.id],
    queryFn: () => api.students.list({
      ...(q && !isRestricted ? { q } : {}),
      ...(classFilter !== 'all' && !isRestricted ? { classId: classFilter } : {}),
      ...(statusFilter !== 'all' && !isRestricted ? { status: statusFilter } : {}),
    }),
  })

  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: api.dashboard.stats, enabled: !isRestricted })
  const { data: meData } = useQuery({ queryKey: ['me', user?.id], queryFn: api.dashboard.me, enabled: isRestricted })

  const createMut = useMutation({
    mutationFn: (data: any) => api.students.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); toast.success('Student admitted successfully'); setAddOpen(false) },
    onError: (e: any) => toast.error('Failed: ' + e.message),
  })

  const openProfile = (id: string) => setSelectedId(id)

  // Student role: auto-open own profile (only 1 record)
  if (isStudent && students && students.length === 1 && !selectedId) {
    setTimeout(() => setSelectedId(students[0].id), 0)
  }

  const myChildren = (meData as any)?.students || []

  return (
    <div className="space-y-5">
      {/* Stat cards — institution-wide for staff, personal for student/parent */}
      {isRestricted ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isStudent && (() => { const m = myChildren[0]; return m ? (
            <>
              <StatCard label="My Attendance" value={`${m.attendancePercent}%`} sub="Last 30 days" icon={UserCheck} accent="emerald" />
              <StatCard label="My Avg Score" value={`${m.avgPct}%`} sub="Recent exams" icon={Award} accent="violet" />
              <StatCard label="Fees Paid" value={fmtINR(m.paidFees)} sub={`of ${fmtINR(m.totalFees)}`} icon={Wallet} accent="primary" />
              <StatCard label="Fee Due" value={fmtINR(m.dueFees)} sub={m.feeStatus === 'Clear' ? 'All clear' : 'Pending'} icon={TrendingDown} accent={m.dueFees > 0 ? 'rose' : 'emerald'} />
            </>
          ) : null })()}
          {isParent && (
            <>
              <StatCard label="My Children" value={myChildren.length} sub="Linked to your account" icon={Users} accent="primary" />
              <StatCard label="Using Transport" value={myChildren.filter((c: any) => c.transportRoute).length} sub="Of your children" icon={Bus} accent="emerald" />
              <StatCard label="Total Fees Due" value={fmtINR(myChildren.reduce((s: number, c: any) => s + (c.dueFees || 0), 0))} sub="Across all children" icon={Wallet} accent="amber" />
              <StatCard label="Avg Attendance" value={`${myChildren.length ? Math.round(myChildren.reduce((s: number, c: any) => s + (c.attendancePercent || 0), 0) / myChildren.length) : 0}%`} sub="All children" icon={UserCheck} accent="violet" />
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Students" value={stats?.totalStudents ?? '—'} sub="Active" icon={Users} accent="primary" loading={!stats} />
          <StatCard label="Boys" value={(stats?.totalStudents ?? 0) - Math.round((stats?.totalStudents ?? 0) * 0.48)} sub="≈52%" icon={GraduationCap} accent="sky" />
          <StatCard label="Girls" value={Math.round((stats?.totalStudents ?? 0) * 0.48)} sub="≈48%" icon={GraduationCap} accent="rose" />
          <StatCard label="New This Year" value={stats?.newAdmissions ?? '—'} sub="Admissions 2026-27" icon={UserPlus} accent="emerald" />
        </div>
      )}

      {/* Personal banner for restricted roles */}
      {isRestricted && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground p-5">
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="relative flex items-center gap-3">
            {isStudent ? <UserCheck className="size-6" /> : <Users className="size-6" />}
            <div>
              <h2 className="text-lg font-bold">{isStudent ? 'My Profile' : 'My Children'}</h2>
              <p className="text-sm opacity-90">
                {isStudent
                  ? 'View and manage your academic, attendance, fee and transport information.'
                  : `You have access to ${myChildren.length} ${myChildren.length === 1 ? 'child' : 'children'}'s records. Other students' data is restricted.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar + table */}
      <Card>
        <CardContent className="p-4">
          {/* Toolbar — only for staff (student/parent can't search/filter/export) */}
          {!isRestricted && (
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Search by name, admission no, parent phone…" value={q} onChange={(e) => setLocalSearch(e.target.value)} className="pl-9 h-10" />
              </div>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-full sm:w-44 h-10"><Filter className="size-3.5 mr-1.5" /><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-36 h-10"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Alumni">Alumni</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => toast.info('Export started — CSV will download shortly')}>
                <Download className="size-4" />
              </Button>
              {canCreate && <AddStudentDialog open={addOpen} onOpenChange={setAddOpen} classes={classes || []} onCreate={(d) => createMut.mutate(d)} loading={createMut.isPending} />}
            </div>
          )}

          {/* For parent with multiple children, show a child filter */}
          {isParent && myChildren.length > 1 && (
            <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-muted/50">
              <Users className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter by child:</span>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setLocalSearch('')} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${!q ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}>All</button>
                {myChildren.map((c: any) => (
                  <button key={c.id} onClick={() => setLocalSearch(c.name)} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${q === c.name ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}>{c.name}</button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border max-h-[60vh] overflow-y-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>{isStudent ? 'My Name' : 'Student'}</TableHead>
                  <TableHead className="hidden md:table-cell">Admission No</TableHead>
                  <TableHead className="hidden sm:table-cell">Class</TableHead>
                  {!isRestricted && <TableHead className="hidden lg:table-cell">Parent</TableHead>}
                  <TableHead className="hidden xl:table-cell">Attendance</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: isRestricted ? 2 : 8 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={isRestricted ? 5 : 7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                )) : students?.length === 0 ? (
                  <TableRow><TableCell colSpan={isRestricted ? 5 : 7} className="text-center py-12"><EmptyState icon={Users} title={isRestricted ? 'No records available' : 'No students found'} description={isRestricted ? 'Your linked records will appear here.' : 'Try adjusting filters or add a new student.'} /></TableCell></TableRow>
                ) : students?.map(s => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openProfile(s.id)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9"><AvatarFallback className="bg-primary/15 text-primary text-xs">{initials(s.fullName)}</AvatarFallback></Avatar>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{s.fullName}</div>
                          <div className="text-[11px] text-muted-foreground md:hidden">{s.admissionNo}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs">{s.admissionNo}</TableCell>
                    <TableCell className="hidden sm:table-cell"><Badge variant="outline">{s.className}</Badge></TableCell>
                    {!isRestricted && <TableCell className="hidden lg:table-cell text-xs">
                      <div className="truncate">{s.fatherName || '-'}</div>
                      <div className="text-muted-foreground">{s.parentPhone}</div>
                    </TableCell>}
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full ${s.attendancePercent! >= 90 ? 'bg-emerald-500' : s.attendancePercent! >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${s.attendancePercent}%` }} />
                        </div>
                        <span className="text-xs tabular-nums">{s.attendancePercent}%</span>
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={s.feeStatus === 'Due' ? 'Overdue' : s.feeStatus === 'Partial' ? 'Partial' : 'Paid'} /></TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openProfile(s.id) }}>View</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-3 text-xs text-muted-foreground flex items-center justify-between">
            <span>{isStudent ? 'Your record' : isParent ? `${students?.length ?? 0} ${students?.length === 1 ? 'child' : 'children'}` : `Showing ${students?.length ?? 0} students`}</span>
            <span>{isRestricted ? 'Click to view full details' : 'Click any row to view full profile'}</span>
          </div>
        </CardContent>
      </Card>

      {selectedId && <StudentProfileDrawer studentId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}

function fmtINR(n: number) {
  if (!n) return '₹0'
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toLocaleString('en-IN')}`
}

function AddStudentDialog({ open, onOpenChange, classes, onCreate, loading }: {
  open: boolean; onOpenChange: (o: boolean) => void; classes: any[];
  onCreate: (d: any) => void; loading: boolean;
}) {
  const [form, setForm] = useState({ firstName: '', lastName: '', dob: '', gender: 'Male', classId: '', fatherName: '', motherName: '', parentPhone: '', parentEmail: '', address: '', bloodGroup: '' })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-10 gap-1.5 shrink-0"><UserPlus className="size-4" /> Add Student</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin">
        <DialogHeader>
          <DialogTitle>Admit New Student</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div><Label>First Name *</Label><Input value={form.firstName} onChange={e => set('firstName', e.target.value)} /></div>
          <div><Label>Last Name *</Label><Input value={form.lastName} onChange={e => set('lastName', e.target.value)} /></div>
          <div><Label>Date of Birth *</Label><Input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} /></div>
          <div><Label>Gender</Label>
            <Select value={form.gender} onValueChange={v => set('gender', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent></Select>
          </div>
          <div><Label>Class</Label>
            <Select value={form.classId} onValueChange={v => set('classId', v)}><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger><SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label>Blood Group</Label>
            <Select value={form.bloodGroup} onValueChange={v => set('bloodGroup', v)}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{['A+','B+','O+','AB+','A-','B-','O-','AB-'].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label>Father's Name</Label><Input value={form.fatherName} onChange={e => set('fatherName', e.target.value)} /></div>
          <div><Label>Mother's Name</Label><Input value={form.motherName} onChange={e => set('motherName', e.target.value)} /></div>
          <div><Label>Parent Phone *</Label><Input value={form.parentPhone} onChange={e => set('parentPhone', e.target.value)} placeholder="+91…" /></div>
          <div><Label>Parent Email</Label><Input value={form.parentEmail} onChange={e => set('parentEmail', e.target.value)} /></div>
          <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={e => set('address', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!form.firstName || !form.lastName || !form.dob || loading} onClick={() => onCreate(form)}>
            {loading ? 'Saving…' : 'Admit Student'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StudentProfileDrawer({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const canEdit = useCan()('students', 'edit')
  const canDelete = useCan()('students', 'delete')
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [assigningRoute, setAssigningRoute] = useState(false)

  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: api.academics.classes })
  const { data: routes } = useQuery({ queryKey: ['routes'], queryFn: api.transport.routes, enabled: canEdit })
  const { data: student, isLoading } = useQuery({ queryKey: ['student', studentId], queryFn: () => api.students.get(studentId) })
  const { data: fees } = useQuery({ queryKey: ['student-fees', studentId], queryFn: () => api.students.fees(studentId) })
  const { data: marks } = useQuery({ queryKey: ['student-marks', studentId], queryFn: () => api.students.marks(studentId) })
  const { data: attendance } = useQuery({ queryKey: ['student-att', studentId], queryFn: () => api.students.attendance(studentId) })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.students.update(id, data),
    onSuccess: () => {
      toast.success('Student updated successfully')
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['student', studentId] })
      setEditOpen(false)
    },
    onError: (e: any) => toast.error('Failed to update: ' + e.message),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.students.remove(id),
    onSuccess: () => {
      toast.success('Student marked as Inactive')
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      setDeleteOpen(false)
      onClose()
    },
    onError: (e: any) => toast.error('Failed to delete: ' + e.message),
  })

  // Assign transport route to this student
  const assignRouteMut = useMutation({
    mutationFn: ({ sid, rid }: { sid: string; rid: string | null }) => api.transport.assignStudent(sid, rid),
    onSuccess: (_d, vars) => {
      toast.success(vars.rid ? 'Transport route assigned' : 'Transport route unassigned')
      qc.invalidateQueries({ queryKey: ['student', studentId] })
      qc.invalidateQueries({ queryKey: ['students'] })
      setAssigningRoute(false)
    },
    onError: (e: any) => toast.error('Failed to assign route: ' + e.message),
  })

  // Find the route object matching the student's current routeId
  // For view-only roles (student/parent), routes may not be fetched — use transportRouteId string as fallback
  const currentRoute = routes?.find((r: any) => r.id === student?.routeId || r.name === student?.transportRouteId)
  const routeDisplayName = currentRoute?.name || student?.transportRouteId || null

  const radarData = (marks || []).slice(0, 8).map(m => ({ subject: m.subject.slice(0, 4), marks: Math.round(((m.obtained || 0) / m.maxMarks) * 100) }))

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl bg-background border-l shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground p-5">
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-white/20"><X className="size-4" /></button>
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border-2 border-white/30"><AvatarFallback className="bg-white/20 text-primary-foreground text-xl">{student ? initials(student.fullName) : '...'}</AvatarFallback></Avatar>
            <div>
              {isLoading ? <Skeleton className="h-6 w-48 bg-white/20" /> : <>
                <h2 className="text-xl font-bold">{student?.fullName}</h2>
                <p className="text-sm opacity-90 font-mono">{student?.admissionNo}</p>
              </>}
              <div className="flex gap-2 mt-1.5">
                {student && <Badge variant="secondary" className="bg-white/20 text-primary-foreground border-0">{student.className} · {student.sectionName}</Badge>}
                {student && <Badge variant="secondary" className="bg-white/20 text-primary-foreground border-0">Roll #{student.rollNo}</Badge>}
                {student && <StatusBadge status={student.status} />}
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-5">
            {/* Personal & Parent details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card><CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><IdCard className="size-4 text-primary" /> Personal</h3>
                <dl className="space-y-2 text-sm">
                  <Info icon={Calendar} label="Date of Birth" value={student ? new Date(student.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''} />
                  <Info icon={Heart} label="Gender" value={student?.gender} />
                  <Info icon={Droplet} label="Blood Group" value={student?.bloodGroup || '—'} />
                  <Info icon={Shield} label="Religion" value={student?.religion || '—'} />
                  <Info icon={MapPin} label="Address" value={student?.address || '—'} />
                </dl>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Users className="size-4 text-primary" /> Parent / Guardian</h3>
                <dl className="space-y-2 text-sm">
                  <Info icon={Users} label="Father" value={student?.fatherName || '—'} />
                  <Info icon={Users} label="Mother" value={student?.motherName || '—'} />
                  <Info icon={Briefcase} label="Occupation" value={student?.parentOccupation || '—'} />
                  <Info icon={Phone} label="Phone" value={student?.parentPhone || '—'} />
                  <Info icon={Mail} label="Email" value={student?.parentEmail || '—'} />
                </dl>
              </CardContent></Card>
            </div>

            {/* Transport assignment + medical */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card><CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Bus className="size-4 text-primary" /> Transport & Medical</h3>
                <dl className="space-y-2 text-sm">
                  <Info icon={Calendar} label="Admission Date" value={student ? new Date(student.admissionDate).toLocaleDateString('en-IN') : ''} />
                  <Info icon={GraduationCap} label="Previous School" value={student?.previousSchool || '—'} />
                  <Info icon={Heart} label="Medical Info" value={student?.medicalInfo || 'No known conditions'} />
                </dl>
                {/* Transport route assignment — interactive for admin/transport_manager */}
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5"><RouteIcon className="size-3" /> Transport Route</span>
                    {canEdit && !assigningRoute && routeDisplayName && (
                      <button onClick={() => setAssigningRoute(true)} className="text-[11px] text-primary hover:underline">Change</button>
                    )}
                    {canEdit && !assigningRoute && !routeDisplayName && (
                      <button onClick={() => setAssigningRoute(true)} className="text-[11px] text-primary hover:underline">Assign Route</button>
                    )}
                  </div>
                  {canEdit && assigningRoute ? (
                    <div className="space-y-2">
                      <Select
                        value={currentRoute?.id || ''}
                        onValueChange={(v) => { assignRouteMut.mutate({ sid: studentId, rid: v === 'none' ? null : v }) }}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select route…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— No transport —</SelectItem>
                          {routes?.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <button onClick={() => setAssigningRoute(false)} className="text-[11px] text-muted-foreground hover:text-foreground">Cancel</button>
                    </div>
                  ) : routeDisplayName ? (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <Navigation className="size-3.5 text-emerald-600" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{routeDisplayName}</div>
                        {currentRoute?.vehicles?.[0] && <div className="text-[11px] text-muted-foreground">Bus: {currentRoute.vehicles[0].vehicleNo}</div>}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                      <Bus className="size-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Not using transport</span>
                    </div>
                  )}
                </div>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="size-4 text-primary" /> Performance Snapshot</h3>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Attendance (30d)</span>
                  <span className="text-2xl font-bold tabular-nums">{student?.attendancePercent ?? 0}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
                  <div className={`h-full ${student && student.attendancePercent! >= 90 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${student?.attendancePercent ?? 0}%` }} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Fee Status</span>
                  <StatusBadge status={student?.feeStatus === 'Due' ? 'Overdue' : student?.feeStatus === 'Partial' ? 'Partial' : 'Paid'} />
                </div>
              </CardContent></Card>
            </div>

            {/* Subject performance radar */}
            {radarData.length > 0 && (
              <Card><CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Award className="size-4 text-primary" /> Subject Performance (Latest Exam)</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                    <Radar dataKey="marks" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent></Card>
            )}

            {/* Fee history */}
            <Card><CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">Fee History</h3>
              <div className="rounded-md border max-h-48 overflow-y-auto scroll-thin">
                <Table>
                  <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Fee</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(fees || []).slice(0, 10).map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-mono text-xs">{f.invoiceNo}</TableCell>
                        <TableCell className="text-xs">{f.feeName}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">₹{f.amount.toLocaleString('en-IN')}</TableCell>
                        <TableCell><StatusBadge status={f.status} /></TableCell>
                      </TableRow>
                    ))}
                    {!fees?.length && <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-4">No fee records</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </CardContent></Card>

            {/* Recent attendance */}
            <Card><CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">Recent Attendance</h3>
              <div className="flex flex-wrap gap-1.5">
                {(attendance || []).slice(0, 21).map(a => (
                  <div key={a.id} className={`size-8 rounded-md grid place-items-center text-[10px] font-medium ${a.status === 'Present' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : a.status === 'Absent' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400' : a.status === 'Late' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-sky-500/15 text-sky-700 dark:text-sky-400'}`} title={`${new Date(a.date).toDateString()} — ${a.status}`}>
                    {new Date(a.date).getDate()}
                  </div>
                ))}
                {!attendance?.length && <p className="text-xs text-muted-foreground">No attendance records</p>}
              </div>
            </CardContent></Card>
          </div>
        </ScrollArea>

        <div className="p-3 border-t space-y-2 shrink-0">
          {(canEdit || canDelete) && (
            <div className="flex gap-2">
              {canEdit && (
                <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => setEditOpen(true)}>
                  <Pencil className="size-3.5" /> Edit
                </Button>
              )}
              {canDelete && (
                <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="flex-1 gap-1.5">
                      <Trash2 className="size-3.5" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete student?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark {student?.fullName ?? 'this student'} as Inactive. Continue?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-rose-600 hover:bg-rose-700 text-white"
                        disabled={deleteMut.isPending}
                        onClick={() => student && deleteMut.mutate(student.id)}
                      >
                        {deleteMut.isPending ? 'Deleting…' : 'Yes, mark Inactive'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => toast.info('Generating ID card PDF…')}>ID Card</Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => toast.info('Generating Bonafide certificate…')}>Bonafide</Button>
            <Button size="sm" className="flex-1" onClick={() => toast.info('Opening fee collection…')}>Collect Fee</Button>
          </div>
        </div>
      </div>

      {canEdit && (
        <EditStudentDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          student={student}
          classes={classes || []}
          onSubmit={(id, data) => updateMut.mutate({ id, data })}
          loading={updateMut.isPending}
        />
      )}
    </div>
  )
}

function EditStudentDialog({ open, onOpenChange, student, classes, onSubmit, loading }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  student: Student | null | undefined
  classes: ClassInfo[]
  onSubmit: (id: string, data: any) => void
  loading: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin">
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
        </DialogHeader>
        {student && (
          <EditStudentForm
            key={student.id}
            student={student}
            classes={classes}
            onSubmit={onSubmit}
            loading={loading}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function EditStudentForm({ student, classes, onSubmit, loading, onCancel }: {
  student: Student
  classes: ClassInfo[]
  onSubmit: (id: string, data: any) => void
  loading: boolean
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    firstName: student.firstName || '',
    lastName: student.lastName || '',
    dob: student.dob ? new Date(student.dob).toISOString().slice(0, 10) : '',
    gender: student.gender || 'Male',
    bloodGroup: student.bloodGroup || '',
    phone: student.phone || '',
    email: student.email || '',
    fatherName: student.fatherName || '',
    motherName: student.motherName || '',
    parentPhone: student.parentPhone || '',
    parentEmail: student.parentEmail || '',
    classId: student.classId || '',
    address: student.address || '',
    medicalInfo: student.medicalInfo || '',
    status: student.status || 'Active',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      <div className="grid grid-cols-2 gap-3 py-2">
        <div><Label>First Name *</Label><Input value={form.firstName} onChange={e => set('firstName', e.target.value)} /></div>
        <div><Label>Last Name *</Label><Input value={form.lastName} onChange={e => set('lastName', e.target.value)} /></div>
        <div><Label>Date of Birth</Label><Input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} /></div>
        <div><Label>Gender</Label>
          <Select value={form.gender} onValueChange={v => set('gender', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent></Select>
        </div>
        <div><Label>Blood Group</Label>
          <Select value={form.bloodGroup} onValueChange={v => set('bloodGroup', v)}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{['A+','B+','O+','AB+','A-','B-','O-','AB-'].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select>
        </div>
        <div><Label>Phone</Label><Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Student phone" /></div>
        <div><Label>Email</Label><Input value={form.email} onChange={e => set('email', e.target.value)} placeholder="Student email" /></div>
        <div><Label>Class</Label>
          <Select value={form.classId} onValueChange={v => set('classId', v)}><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger><SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
        </div>
        <div><Label>Father&rsquo;s Name</Label><Input value={form.fatherName} onChange={e => set('fatherName', e.target.value)} /></div>
        <div><Label>Mother&rsquo;s Name</Label><Input value={form.motherName} onChange={e => set('motherName', e.target.value)} /></div>
        <div><Label>Parent Phone</Label><Input value={form.parentPhone} onChange={e => set('parentPhone', e.target.value)} placeholder="+91…" /></div>
        <div><Label>Parent Email</Label><Input value={form.parentEmail} onChange={e => set('parentEmail', e.target.value)} /></div>
        <div><Label>Status</Label>
          <Select value={form.status} onValueChange={v => set('status', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem><SelectItem value="Alumni">Alumni</SelectItem></SelectContent></Select>
        </div>
        <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={e => set('address', e.target.value)} /></div>
        <div className="col-span-2"><Label>Medical Info</Label><Input value={form.medicalInfo} onChange={e => set('medicalInfo', e.target.value)} placeholder="Allergies, conditions, etc." /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button disabled={!form.firstName || !form.lastName || loading} onClick={() => onSubmit(student.id, form)}>
          {loading ? 'Saving…' : 'Save Changes'}
        </Button>
      </DialogFooter>
    </>
  )
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] text-muted-foreground">{label}</dt>
        <dd className="text-sm truncate">{value}</dd>
      </div>
    </div>
  )
}
