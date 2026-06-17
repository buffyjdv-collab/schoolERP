'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AdmissionEnquiry, Application } from '@/lib/types'
import { StatCard, SectionHeader, StatusBadge, EmptyState } from '@/components/erp/primitives'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  UserPlus, ClipboardList, FileCheck2, Percent, Search, MoreHorizontal,
  ChevronRight, Mail, MessageSquare, CheckCircle2,
  ClipboardCheck, CalendarClock, Ban, FileText, GraduationCap,
} from 'lucide-react'
import { toast } from 'sonner'

const CLASSES = Array.from({ length: 10 }, (_, i) => `Class ${i + 1}`)
const SOURCES = ['Website', 'Walk-in', 'Referral'] as const

// Pipeline stages (ordered)
const PIPELINE = [
  { key: 'Enquiry', label: 'Enquiry', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', dot: 'bg-sky-500' },
  { key: 'Application', label: 'Application', color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', dot: 'bg-violet-500' },
  { key: 'Test', label: 'Test / Assessment', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  { key: 'Interview', label: 'Interview', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400', dot: 'bg-teal-500' },
  { key: 'Approved', label: 'Approved', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
] as const

// Enquiry status progression
const ENQUIRY_FLOW: Record<string, string | null> = {
  Enquiry: 'Application',
  Application: 'Test',
  Test: 'Interview',
  Interview: 'Approved',
  Approved: null,
  Rejected: null,
}

const APPLICATION_FLOW: Record<string, string | null> = {
  Submitted: 'Verified',
  Verified: 'TestScheduled',
  TestScheduled: 'Approved',
  Approved: null,
  Rejected: null,
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

// ============ New Enquiry Dialog ============
function NewEnquiryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    studentName: '', parentName: '', phone: '', email: '',
    classApplied: 'Class 1', source: 'Website' as (typeof SOURCES)[number], message: '',
  })

  const createMut = useMutation({
    mutationFn: (data: typeof form) => api.admissions.createEnquiry(data),
    onSuccess: () => {
      toast.success('Enquiry captured', { description: 'A new admission enquiry has been logged.' })
      qc.invalidateQueries({ queryKey: ['admissions', 'enquiries'] })
      onOpenChange(false)
      setForm({ studentName: '', parentName: '', phone: '', email: '', classApplied: 'Class 1', source: 'Website', message: '' })
    },
    onError: () => toast.error('Failed to create enquiry'),
  })

  const valid = form.studentName.trim() && form.parentName.trim() && form.phone.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="size-4 text-primary" /> New Admission Enquiry</DialogTitle>
          <DialogDescription>Capture a prospective parent&rsquo;s admission enquiry. This enters the Enquiry stage of the pipeline.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ne-student">Student Name *</Label>
            <Input id="ne-student" value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} placeholder="e.g. Aarav Sharma" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ne-parent">Parent / Guardian *</Label>
            <Input id="ne-parent" value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} placeholder="e.g. Rajesh Sharma" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ne-phone">Phone *</Label>
            <Input id="ne-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ne-email">Email</Label>
            <Input id="ne-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="parent@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Class Applied</Label>
            <Select value={form.classApplied} onValueChange={(v) => setForm({ ...form, classApplied: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Source</Label>
            <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v as (typeof SOURCES)[number] })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ne-msg">Message / Notes</Label>
            <Textarea id="ne-msg" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Any specific query from the parent…" rows={3} />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={() => createMut.mutate(form)} disabled={!valid || createMut.isPending} className="gap-1.5">
            {createMut.isPending ? <CheckCircle2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Create Enquiry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ Pipeline overview tab ============
function PipelineOverview({
  enquiries, applications, onNew,
}: {
  enquiries: AdmissionEnquiry[]
  applications: Application[]
  onNew: () => void
}) {
  // Compute counts per pipeline stage by combining enquiries + applications statuses
  const count = (stage: string) => {
    const e = enquiries.filter((x) => x.status === stage).length
    let a = 0
    if (stage === 'Application') a = applications.filter((x) => x.status === 'Submitted' || x.status === 'Verified').length
    if (stage === 'Test') a = applications.filter((x) => x.status === 'TestScheduled').length
    if (stage === 'Approved') a = applications.filter((x) => x.status === 'Approved').length
    return e + a
  }
  const total = enquiries.length + applications.length
  const rejected = enquiries.filter((e) => e.status === 'Rejected').length + applications.filter((a) => a.status === 'Rejected').length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="size-4 text-primary" /> Admission Pipeline</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Live stages from initial enquiry through to enrolment. Click &ldquo;New Enquiry&rdquo; to capture a lead.</p>
            </div>
            <Button size="sm" className="gap-1.5" onClick={onNew}><UserPlus className="size-4" /> New Enquiry</Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Pipeline visualization */}
          <div className="flex flex-col lg:flex-row items-stretch gap-3 lg:gap-0">
            {PIPELINE.map((stage, idx) => {
              const n = count(stage.key)
              const pct = total ? Math.round((n / total) * 100) : 0
              return (
                <div key={stage.key} className="flex items-center gap-3 lg:gap-0 flex-1 min-w-0">
                  <div className={`relative flex-1 rounded-xl border p-4 lg:p-5 transition-all hover:shadow-md ${idx === PIPELINE.length - 1 ? 'border-emerald-500/30' : 'border-border'}`}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className={`size-8 rounded-lg grid place-items-center ${stage.color}`}>
                        <span className="text-xs font-bold">{idx + 1}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] tabular-nums">{pct}%</Badge>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">{stage.label}</p>
                    <p className="text-2xl font-bold tabular-nums mt-0.5">{n}</p>
                  </div>
                  {idx < PIPELINE.length - 1 && (
                    <ChevronRight className="size-5 text-muted-foreground/50 mx-1 lg:mx-2 shrink-0 rotate-90 lg:rotate-0" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Rejected / totals strip */}
          <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t">
            <div className="flex items-center gap-2 text-xs">
              <span className={`size-2 rounded-full ${PIPELINE[0].dot}`} />
              <span className="text-muted-foreground">Total Leads</span>
              <span className="font-semibold tabular-nums">{total}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="size-2 rounded-full bg-rose-500" />
              <span className="text-muted-foreground">Rejected</span>
              <span className="font-semibold tabular-nums">{rejected}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Conversion</span>
              <span className="font-semibold tabular-nums">{total ? Math.round((count('Approved') / total) * 100) : 0}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent activity feed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="size-4 text-primary" /> Recent Enquiries</CardTitle>
        </CardHeader>
        <CardContent>
          {enquiries.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No enquiries yet" description="Create your first admission enquiry to populate the pipeline." />
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto scroll-thin pr-1">
              {enquiries.slice(0, 8).map((e) => (
                <div key={e.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <div className="size-9 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-semibold shrink-0">{initials(e.studentName)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate">{e.studentName}</p>
                      <StatusBadge status={e.status} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{e.parentName} · {e.phone} · {e.classApplied}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{fmtDate(e.createdAt)} · via {e.source}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============ Enquiries table ============
function EnquiriesTable({ enquiries }: { enquiries: AdmissionEnquiry[] }) {
  const qc = useQueryClient()
  const [q, setQ] = useState('')

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.admissions.updateEnquiry(id, { status }),
    onSuccess: (_data, vars) => {
      toast.success(`Status updated to ${vars.status}`)
      qc.invalidateQueries({ queryKey: ['admissions', 'enquiries'] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  const filtered = enquiries.filter((e) => {
    if (!q) return true
    const s = q.toLowerCase()
    return e.studentName.toLowerCase().includes(s) || e.phone.includes(s) || e.parentName.toLowerCase().includes(s)
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Enquiries</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{filtered.length} record{filtered.length !== 1 ? 's' : ''}{q ? ` matching "${q}"` : ''}</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or phone…" className="pl-9" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {filtered.length === 0 ? (
          <div className="px-6 pb-2"><EmptyState icon={ClipboardList} title="No enquiries found" description={q ? 'Try a different search term.' : 'New enquiries will appear here.'} /></div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="pl-6">Student</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => {
                  const next = ENQUIRY_FLOW[e.status]
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="size-8 rounded-full bg-primary/10 text-primary grid place-items-center text-[11px] font-semibold shrink-0">{initials(e.studentName)}</div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{e.studentName}</p>
                            {e.email && <p className="text-[11px] text-muted-foreground truncate">{e.email}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{e.parentName}</TableCell>
                      <TableCell className="text-sm tabular-nums">{e.phone}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[11px]">{e.classApplied}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.source}</TableCell>
                      <TableCell><StatusBadge status={e.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{fmtDate(e.createdAt)}</TableCell>
                      <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel>Advance status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {next && (
                              <DropdownMenuItem onClick={() => updateMut.mutate({ id: e.id, status: next })} className="gap-2">
                                <ChevronRight className="size-4 text-primary" /> Move to {next}
                              </DropdownMenuItem>
                            )}
                            {(e.status !== 'Approved' && e.status !== 'Rejected') && (
                              <>
                                <DropdownMenuItem onClick={() => updateMut.mutate({ id: e.id, status: 'Approved' })} className="gap-2">
                                  <CheckCircle2 className="size-4 text-emerald-600" /> Approve
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => updateMut.mutate({ id: e.id, status: 'Rejected' })} className="gap-2">
                                  <Ban className="size-4" /> Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            {e.message && (
                              <>
                                <DropdownMenuSeparator />
                                <div className="px-2 py-1.5 text-[11px] text-muted-foreground max-w-[220px]">
                                  <span className="font-medium text-foreground">Note:</span> {e.message}
                                </div>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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

// ============ Applications table ============
function ApplicationsTable({ applications }: { applications: Application[] }) {
  const qc = useQueryClient()
  const [q, setQ] = useState('')

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.admissions.updateApplication(id, { status }),
    onSuccess: (_d, vars) => {
      if (vars.status === 'Approved') {
        toast.success('Student master record created', { description: 'The applicant is now an enrolled student.' })
      } else {
        toast.success(`Application marked ${vars.status}`)
      }
      qc.invalidateQueries({ queryKey: ['admissions', 'applications'] })
    },
    onError: () => toast.error('Failed to update application'),
  })

  const filtered = applications.filter((a) => {
    if (!q) return true
    const s = q.toLowerCase()
    return a.studentName.toLowerCase().includes(s) || a.phone.includes(s) || (a.previousSchool || '').toLowerCase().includes(s)
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Applications</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{filtered.length} application{filtered.length !== 1 ? 's' : ''}{q ? ` matching "${q}"` : ''}</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, phone, school…" className="pl-9" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {filtered.length === 0 ? (
          <div className="px-6 pb-2"><EmptyState icon={FileText} title="No applications found" description={q ? 'Try a different search term.' : 'Promote enquiries to applications to see them here.'} /></div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="pl-6">Student</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Previous School</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-8 rounded-full bg-primary/10 text-primary grid place-items-center text-[11px] font-semibold shrink-0">{initials(a.studentName)}</div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{a.studentName}</p>
                          <p className="text-[11px] text-muted-foreground truncate tabular-nums">{a.phone}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{a.parentName}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[11px]">{a.classApplied}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">{a.previousSchool || '—'}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{fmtDate(a.createdAt)}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Process application</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {a.status === 'Submitted' && (
                            <DropdownMenuItem onClick={() => updateMut.mutate({ id: a.id, status: 'Verified' })} className="gap-2">
                              <ClipboardCheck className="size-4 text-primary" /> Verify Documents
                            </DropdownMenuItem>
                          )}
                          {(a.status === 'Verified') && (
                            <DropdownMenuItem onClick={() => updateMut.mutate({ id: a.id, status: 'TestScheduled' })} className="gap-2">
                              <CalendarClock className="size-4 text-amber-600" /> Schedule Test
                            </DropdownMenuItem>
                          )}
                          {a.status !== 'Approved' && a.status !== 'Rejected' && (
                            <>
                              <DropdownMenuItem onClick={() => updateMut.mutate({ id: a.id, status: 'Approved' })} className="gap-2">
                                <GraduationCap className="size-4 text-emerald-600" /> Approve &amp; Create Student
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => updateMut.mutate({ id: a.id, status: 'Rejected' })} className="gap-2">
                                <Ban className="size-4" /> Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          {a.email && (
                            <>
                              <DropdownMenuSeparator />
                              <div className="px-2 py-1.5 text-[11px] text-muted-foreground flex items-center gap-1.5">
                                <Mail className="size-3" /> {a.email}
                              </div>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============ Main module ============
export function AdmissionsModule() {
  const [tab, setTab] = useState('pipeline')
  const [newOpen, setNewOpen] = useState(false)

  const enquiriesQ = useQuery({ queryKey: ['admissions', 'enquiries'], queryFn: api.admissions.enquiries })
  const applicationsQ = useQuery({ queryKey: ['admissions', 'applications'], queryFn: api.admissions.applications })

  const enquiries = enquiriesQ.data ?? []
  const applications = applicationsQ.data ?? []
  const loading = enquiriesQ.isLoading || applicationsQ.isLoading

  const approvedThisYear = applications.filter((a) => a.status === 'Approved').length + enquiries.filter((e) => e.status === 'Approved').length
  const pendingApplications = applications.filter((a) => a.status !== 'Approved' && a.status !== 'Rejected').length
  const totalLeads = enquiries.length + applications.length
  const conversionRate = totalLeads ? Math.round((approvedThisYear / totalLeads) * 100) : 0

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Admissions"
        description="Track enquiries, applications and convert leads to enrolled students."
        action={<Button className="gap-1.5" onClick={() => setNewOpen(true)}><UserPlus className="size-4" /> New Enquiry</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Enquiries" value={enquiries.length} sub="All-time leads" icon={ClipboardList} accent="primary" loading={enquiriesQ.isLoading} />
        <StatCard label="Pending Applications" value={pendingApplications} sub="Awaiting decision" icon={FileText} accent="amber" loading={applicationsQ.isLoading} />
        <StatCard label="Approved This Year" value={approvedThisYear} sub="Admitted students" icon={FileCheck2} accent="emerald" loading={loading} />
        <StatCard label="Conversion Rate" value={`${conversionRate}%`} sub="Leads → Admissions" icon={Percent} accent="violet" loading={loading} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pipeline" className="gap-1.5"><ClipboardList className="size-4" /> Pipeline</TabsTrigger>
          <TabsTrigger value="enquiries" className="gap-1.5"><MessageSquare className="size-4" /> Enquiries</TabsTrigger>
          <TabsTrigger value="applications" className="gap-1.5"><FileText className="size-4" /> Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : (
            <PipelineOverview enquiries={enquiries} applications={applications} onNew={() => setNewOpen(true)} />
          )}
        </TabsContent>

        <TabsContent value="enquiries" className="mt-4">
          {enquiriesQ.isLoading ? (
            <Card><CardContent><Skeleton className="h-72 w-full" /></CardContent></Card>
          ) : (
            <EnquiriesTable enquiries={enquiries} />
          )}
        </TabsContent>

        <TabsContent value="applications" className="mt-4">
          {applicationsQ.isLoading ? (
            <Card><CardContent><Skeleton className="h-72 w-full" /></CardContent></Card>
          ) : (
            <ApplicationsTable applications={applications} />
          )}
        </TabsContent>
      </Tabs>

      <NewEnquiryDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  )
}
