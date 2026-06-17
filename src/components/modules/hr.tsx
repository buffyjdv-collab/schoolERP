'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Employee, LeaveRequest, Payroll } from '@/lib/types'
import { StatCard, SectionHeader, StatusBadge, EmptyState } from '@/components/erp/primitives'
import {
  Card, CardContent, CardHeader, CardTitle,
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  Users, CalendarOff, CalendarClock, Wallet, Search, UserCheck, BadgeCheck,
  ShieldCheck, Crown, Ban, FileText, PlayCircle, IndianRupee, Mail, Phone, MapPin,
} from 'lucide-react'
import { toast } from 'sonner'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function fmtINRShort(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n}`
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

function dayCount(start: string, end: string) {
  const d = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1
  return d
}

// ============ Employees Tab ============
function EmployeesTab({ employees }: { employees: Employee[] }) {
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('all')
  const [selected, setSelected] = useState<Employee | null>(null)

  const depts = Array.from(new Set(employees.map((e) => e.department))).sort()
  const filtered = employees.filter((e) => {
    if (dept !== 'all' && e.department !== dept) return false
    if (!q) return true
    const s = q.toLowerCase()
    return e.fullName.toLowerCase().includes(s) || e.empCode.toLowerCase().includes(s) || e.designation.toLowerCase().includes(s) || (e.email || '').toLowerCase().includes(s)
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><Users className="size-4 text-primary" /> Employees</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{filtered.length} of {employees.length} staff</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {depts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative w-full sm:w-64">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, code, email…" className="pl-9" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {filtered.length === 0 ? (
          <div className="px-6 pb-4"><EmptyState icon={Users} title="No employees found" description={q || dept !== 'all' ? 'Try a different search or filter.' : 'Employees will appear here.'} /></div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-24">Emp Code</TableHead>
                  <TableHead className="min-w-[180px]">Name</TableHead>
                  <TableHead className="hidden md:table-cell">Designation</TableHead>
                  <TableHead className="hidden lg:table-cell">Department</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="hidden xl:table-cell">Joined</TableHead>
                  <TableHead className="text-right">Salary</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id} className="hover:bg-accent/50 cursor-pointer" onClick={() => setSelected(e)}>
                    <TableCell className="font-mono text-xs">{e.empCode}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-semibold shrink-0">{initials(e.fullName)}</div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{e.fullName}</div>
                          <div className="text-xs text-muted-foreground md:hidden truncate">{e.designation}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{e.designation}</TableCell>
                    <TableCell className="hidden lg:table-cell"><Badge variant="outline" className="text-[10px]">{e.department}</Badge></TableCell>
                    <TableCell className="hidden sm:table-cell text-xs">{e.phone}</TableCell>
                    <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">{fmtDate(e.joiningDate)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{fmtINR(e.salary)}</TableCell>
                    <TableCell><StatusBadge status={e.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <EmployeeDialog employee={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} />
    </Card>
  )
}

function EmployeeDialog({ employee, open, onOpenChange }: { employee: Employee | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  if (!employee) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserCheck className="size-4 text-primary" /> Employee Details</DialogTitle>
          <DialogDescription>HR record for {employee.empCode}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="size-14 rounded-full bg-primary/10 text-primary grid place-items-center text-lg font-semibold">{initials(employee.fullName)}</div>
            <div>
              <p className="font-semibold">{employee.fullName}</p>
              <p className="text-xs text-muted-foreground">{employee.designation} · {employee.department}</p>
              <div className="mt-1"><StatusBadge status={employee.status} /></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-0.5"><p className="text-xs text-muted-foreground">Emp Code</p><p className="font-mono text-xs">{employee.empCode}</p></div>
            <div className="space-y-0.5"><p className="text-xs text-muted-foreground">Joining Date</p><p>{fmtDate(employee.joiningDate)}</p></div>
            <div className="space-y-0.5"><p className="text-xs text-muted-foreground">Gender</p><p>{employee.gender}</p></div>
            <div className="space-y-0.5"><p className="text-xs text-muted-foreground">Date of Birth</p><p>{employee.dob ? fmtDate(employee.dob) : '—'}</p></div>
            <div className="space-y-0.5"><p className="text-xs text-muted-foreground">Salary</p><p className="font-medium">{fmtINR(employee.salary)}/mo</p></div>
            <div className="space-y-0.5"><p className="text-xs text-muted-foreground">Email</p><p className="truncate text-xs">{employee.email || '—'}</p></div>
          </div>
          <div className="rounded-lg border p-3 space-y-1.5 text-sm bg-muted/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="size-3.5" /> {employee.phone}</div>
            {employee.email && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="size-3.5" /> {employee.email}</div>}
            {employee.address && <div className="flex items-start gap-2 text-xs text-muted-foreground"><MapPin className="size-3.5 mt-0.5 shrink-0" /> {employee.address}</div>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============ Leave Requests Tab ============
function LeavesTab({ leaves }: { leaves: LeaveRequest[] }) {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const approveMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.hr.approveLeave(id, status),
    onSuccess: (_d, vars) => {
      const label = vars.status === 'HODApproved' ? 'HOD approved' : vars.status === 'PrincipalApproved' ? 'Principal approved' : 'rejected'
      toast.success(`Leave ${label}`, { description: 'The leave request has been updated.' })
      qc.invalidateQueries({ queryKey: ['hr', 'leaves'] })
    },
    onError: () => toast.error('Failed to update leave'),
  })

  const filtered = leaves.filter((l) => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false
    if (!q) return true
    const s = q.toLowerCase()
    return l.employeeName.toLowerCase().includes(s) || l.empCode.toLowerCase().includes(s) || l.leaveType.toLowerCase().includes(s) || l.reason.toLowerCase().includes(s)
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><CalendarOff className="size-4 text-primary" /> Leave Requests</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{filtered.length} of {leaves.length} requests</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="HODApproved">HOD Approved</SelectItem>
                <SelectItem value="PrincipalApproved">Principal Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative w-full sm:w-64">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search employee, type, reason…" className="pl-9" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {filtered.length === 0 ? (
          <div className="px-6 pb-4"><EmptyState icon={CalendarOff} title="No leave requests" description={q || statusFilter !== 'all' ? 'Try a different filter.' : 'Leave applications will appear here.'} /></div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="min-w-[180px]">Employee</TableHead>
                  <TableHead className="hidden md:table-cell">Designation</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="hidden lg:table-cell min-w-[200px]">Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => {
                  const days = dayCount(l.startDate, l.endDate)
                  const pending = l.status === 'Pending'
                  return (
                    <TableRow key={l.id} className="hover:bg-accent/50">
                      <TableCell>
                        <div className="text-sm font-medium">{l.employeeName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{l.empCode}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">{l.designation}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{l.leaveType}</Badge></TableCell>
                      <TableCell>
                        <div className="text-xs">{fmtDate(l.startDate)} → {fmtDate(l.endDate)}</div>
                        <div className="text-[11px] text-muted-foreground">{days} day{days !== 1 ? 's' : ''}</div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[260px] truncate">{l.reason}</TableCell>
                      <TableCell><StatusBadge status={l.status} /></TableCell>
                      <TableCell className="text-right">
                        {pending ? (
                          <div className="flex justify-end gap-1.5">
                            <Button size="sm" variant="outline" className="h-8 gap-1 px-2" disabled={approveMut.isPending} onClick={() => approveMut.mutate({ id: l.id, status: 'HODApproved' })} title="HOD Approve">
                              <ShieldCheck className="size-3.5" /> <span className="hidden xl:inline">HOD</span>
                            </Button>
                            <Button size="sm" variant="default" className="h-8 gap-1 px-2" disabled={approveMut.isPending} onClick={() => approveMut.mutate({ id: l.id, status: 'PrincipalApproved' })} title="Principal Approve">
                              <Crown className="size-3.5" /> <span className="hidden xl:inline">Principal</span>
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 gap-1 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10" disabled={approveMut.isPending} onClick={() => approveMut.mutate({ id: l.id, status: 'Rejected' })} title="Reject">
                              <Ban className="size-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Resolved</span>
                        )}
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

// ============ Payroll Tab ============
function PayrollTab() {
  const qc = useQueryClient()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [month, setMonth] = useState(currentMonth)

  const { data: payroll, isLoading } = useQuery({ queryKey: ['hr', 'payroll', month], queryFn: () => api.hr.payroll(month) })

  const runMut = useMutation({
    mutationFn: (m: string) => api.hr.runPayroll(m),
    onSuccess: (data) => {
      toast.success('Payroll run complete', { description: `${data.created} payslips created (of ${data.total} active employees).` })
      qc.invalidateQueries({ queryKey: ['hr', 'payroll', month] })
    },
    onError: () => toast.error('Failed to run payroll'),
  })

  const totals = (payroll || []).reduce(
    (acc, p) => ({ basic: acc.basic + p.basicSalary, allowances: acc.allowances + p.allowances, deductions: acc.deductions + p.deductions, net: acc.net + p.netPay }),
    { basic: 0, allowances: 0, deductions: 0, net: 0 },
  )

  const markPaid = (p: Payroll) => {
    toast.success('Payslip generated', { description: `Payslip for ${p.employeeName} (${p.month}) is ready to disburse.` })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><Wallet className="size-4 text-primary" /> Payroll</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{payroll?.length ?? 0} payslips for {new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="space-y-1">
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full sm:w-44" />
            </div>
            <Button onClick={() => runMut.mutate(month)} disabled={runMut.isPending} className="gap-1.5">
              {runMut.isPending ? <PlayCircle className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
              Run Payroll
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {isLoading ? (
          <div className="px-6 pb-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !payroll || payroll.length === 0 ? (
          <div className="px-6 pb-4"><EmptyState icon={Wallet} title="No payroll for this month" description="Click Run Payroll to generate payslips for all active employees." /></div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-24">Emp Code</TableHead>
                  <TableHead className="min-w-[180px]">Employee</TableHead>
                  <TableHead className="text-right">Basic</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Allowances</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Deductions</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payroll.map((p) => (
                  <TableRow key={p.id} className="hover:bg-accent/50">
                    <TableCell className="font-mono text-xs">{p.empCode}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{p.employeeName}</div>
                      <div className="text-xs text-muted-foreground">{p.month}</div>
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{fmtINR(p.basicSalary)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums hidden sm:table-cell text-emerald-600">+{fmtINR(p.allowances)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums hidden sm:table-cell text-rose-600">−{fmtINR(p.deductions)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">{fmtINR(p.netPay)}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-right">
                      {p.status === 'Processed' ? (
                        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => markPaid(p)}>
                          <FileText className="size-3.5" /> <span className="hidden lg:inline">Mark Paid</span>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">{p.paidAt ? fmtDate(p.paidAt) : '—'}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="sticky bottom-0 bg-muted/50 backdrop-blur">
                <TableRow className="font-semibold">
                  <TableCell colSpan={2} className="text-sm">Totals ({payroll.length} employees)</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{fmtINR(totals.basic)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums hidden sm:table-cell text-emerald-600">+{fmtINR(totals.allowances)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums hidden sm:table-cell text-rose-600">−{fmtINR(totals.deductions)}</TableCell>
                  <TableCell className="text-right text-sm font-bold tabular-nums">{fmtINR(totals.net)}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============ Main module ============
export function HrModule() {
  const { data: employees, isLoading: empLoading } = useQuery({ queryKey: ['hr', 'employees'], queryFn: api.hr.employees })
  const { data: leaves, isLoading: leavesLoading } = useQuery({ queryKey: ['hr', 'leaves'], queryFn: api.hr.leaves })
  const currentMonth = new Date().toISOString().slice(0, 7)
  const { data: payroll, isLoading: payLoading } = useQuery({ queryKey: ['hr', 'payroll', currentMonth], queryFn: () => api.hr.payroll(currentMonth) })

  const totalEmployees = employees?.length ?? 0
  const today = new Date().toISOString().slice(0, 10)
  const onLeaveToday = leaves?.filter((l) => l.status === 'PrincipalApproved' && new Date(l.startDate).getTime() <= Date.now() && new Date(l.endDate).getTime() >= Date.now()).length ?? 0
  const pendingLeaves = leaves?.filter((l) => l.status === 'Pending').length ?? 0
  const monthlyPayrollCost = payroll?.reduce((s, p) => s + p.netPay, 0) ?? 0

  return (
    <div className="space-y-6">
      <SectionHeader
        title="HR & Payroll"
        description="Manage staff records, leave approvals and monthly payroll."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={totalEmployees} sub={`${employees?.filter((e) => e.status === 'Active').length ?? 0} active`} icon={Users} accent="primary" loading={empLoading} />
        <StatCard label="On Leave Today" value={onLeaveToday} sub="Approved & current" icon={CalendarOff} accent="amber" loading={leavesLoading} />
        <StatCard label="Pending Leaves" value={pendingLeaves} sub="Awaiting approval" icon={CalendarClock} accent="rose" loading={leavesLoading} />
        <StatCard label="Monthly Payroll" value={fmtINRShort(monthlyPayrollCost)} sub={`For ${new Date(currentMonth + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`} icon={Wallet} accent="emerald" loading={payLoading} />
      </div>

      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees" className="gap-1.5"><Users className="size-4" /> Employees</TabsTrigger>
          <TabsTrigger value="leaves" className="gap-1.5"><CalendarOff className="size-4" /> Leave Requests</TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1.5"><Wallet className="size-4" /> Payroll</TabsTrigger>
        </TabsList>
        <TabsContent value="employees" className="mt-4">
          {empLoading ? <Card><CardContent className="p-6 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</CardContent></Card>
            : <EmployeesTab employees={employees || []} />}
        </TabsContent>
        <TabsContent value="leaves" className="mt-4">
          {leavesLoading ? <Card><CardContent className="p-6 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</CardContent></Card>
            : <LeavesTab leaves={leaves || []} />}
        </TabsContent>
        <TabsContent value="payroll" className="mt-4"><PayrollTab /></TabsContent>
      </Tabs>
    </div>
  )
}
