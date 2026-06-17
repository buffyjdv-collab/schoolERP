'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { StatCard, SectionHeader, StatusBadge, EmptyState } from '@/components/erp/primitives'
import type { FeeInvoice } from '@/lib/types'
import {
  Wallet, TrendingUp, TrendingDown, AlertTriangle, Search, Download,
  IndianRupee, FileText, Receipt, CheckCircle2, CreditCard, Banknote, Smartphone, Building2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useState } from 'react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { useCan } from '@/lib/store'

function fmtINR(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toLocaleString('en-IN')}`
}

const PIE_COLORS = ['#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#0ea5e9']
const METHOD_ICONS: Record<string, any> = { Cash: Banknote, Card: CreditCard, Online: Smartphone, UPI: Smartphone }

export function FeesModule() {
  const canCollect = useCan()('fees', 'collect')
  const canPay = useCan()('fees', 'pay')
  const canCreate = useCan()('fees', 'create')
  const [tab, setTab] = useState('invoices')
  const [statusFilter, setStatusFilter] = useState('all')
  const [q, setQ] = useState('')
  const [payInvoice, setPayInvoice] = useState<FeeInvoice | null>(null)

  const qc = useQueryClient()
  const { data: summary, isLoading: sumLoading } = useQuery({ queryKey: ['fee-summary'], queryFn: api.fees.summary })
  const { data: structures } = useQuery({ queryKey: ['fee-structures'], queryFn: api.fees.structures })
  const { data: invoices, isLoading: invLoading } = useQuery({
    queryKey: ['invoices', statusFilter, q],
    queryFn: () => api.fees.invoices({ ...(statusFilter !== 'all' ? { status: statusFilter } : {}), ...(q ? { q } : {}) }),
  })

  const payMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { paidAmount: number; paymentMethod: string } }) => api.fees.collect(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['fee-summary'] }); toast.success('Payment recorded successfully'); setPayInvoice(null) },
    onError: (e: any) => toast.error('Payment failed: ' + e.message),
  })

  const collectionRate = summary ? Math.round((summary.collected / (summary.collected + summary.pending)) * 100) : 0

  return (
    <div className="space-y-5">
      {/* Top stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Collected" value={fmtINR(summary?.collected ?? 0)} sub="All-time" icon={TrendingUp} accent="emerald" loading={sumLoading} />
        <StatCard label="Outstanding" value={fmtINR(summary?.pending ?? 0)} sub="To be collected" icon={TrendingDown} accent="amber" loading={sumLoading} />
        <StatCard label="Defaulters" value={summary?.defaulters ?? '—'} sub="Students with dues" icon={AlertTriangle} accent="rose" loading={sumLoading} />
        <StatCard label="Collection Rate" value={`${collectionRate}%`} sub="Of total billed" icon={Wallet} accent="primary" loading={sumLoading} />
      </div>

      {/* Collection progress + charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Wallet className="size-4 text-primary" /> Collection Overview</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Target: {fmtINR((summary?.collected ?? 0) + (summary?.pending ?? 0))}</span>
              <span className="text-sm font-semibold">{collectionRate}%</span>
            </div>
            <Progress value={collectionRate} className="h-3 mb-4" />
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={summary?.byStatus || []} margin={{ left: -10, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[4,4,0,0]}>
                  {(summary?.byStatus || []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Payment Methods</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={summary?.byMethod || []} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3}>
                  {(summary?.byMethod || []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => fmtINR(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          {canCollect && <TabsTrigger value="defaulters">Defaulters</TabsTrigger>}
          <TabsTrigger value="structures">Fee Structure</TabsTrigger>
          {canCollect && <TabsTrigger value="accounting">Accounting</TabsTrigger>}
        </TabsList>

        {/* Invoices tab */}
        <TabsContent value="invoices" className="mt-4">
          <Card><CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Search invoice no, student name, admission no…" value={q} onChange={e => setQ(e.target.value)} className="pl-9 h-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44 h-10"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-10 gap-1.5" onClick={() => toast.info('Exporting invoices to CSV…')}><Download className="size-4" /> Export</Button>
            </div>
            <div className="rounded-lg border max-h-[55vh] overflow-y-auto scroll-thin">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead className="hidden md:table-cell">Fee Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invLoading ? Array.from({length:8}).map((_,i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)
                  : !invoices?.length ? <TableRow><TableCell colSpan={7}><EmptyState icon={Receipt} title="No invoices" description="Adjust filters to see invoices." /></TableCell></TableRow>
                  : invoices.map(inv => (
                    <TableRow key={inv.id} className={inv.status === 'Overdue' ? 'bg-rose-500/5' : ''}>
                      <TableCell className="font-mono text-xs">{inv.invoiceNo}</TableCell>
                      <TableCell>
                        <div className="text-sm font-medium truncate max-w-[140px]">{inv.studentName}</div>
                        <div className="text-[11px] text-muted-foreground">{inv.admissionNo} · {inv.className}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">{inv.feeName}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">₹{inv.amount.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium">{inv.balance > 0 ? `₹${inv.balance.toLocaleString('en-IN')}` : '—'}</TableCell>
                      <TableCell><StatusBadge status={inv.status} /></TableCell>
                      <TableCell className="text-right">
                        {inv.status !== 'Paid' ? (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPayInvoice(inv)}>
                            <IndianRupee className="size-3" /> {(canCollect || canPay) ? (canPay && !canCollect ? 'Pay' : 'Collect') : 'View'}
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toast.info(`Receipt ${inv.invoiceNo} ready`)}>Receipt</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* Defaulters tab */}
        <TabsContent value="defaulters" className="mt-4">
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-rose-500/5 border border-rose-500/20">
              <AlertTriangle className="size-5 text-rose-600" />
              <div>
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">{summary?.defaulters ?? 0} students have outstanding fees</p>
                <p className="text-xs text-muted-foreground">Total dues: {fmtINR(summary?.pending ?? 0)} · Send reminders via Communication module</p>
              </div>
              <Button size="sm" variant="outline" className="ml-auto" onClick={() => toast.info('Sending SMS reminders to defaulters…')}>Send Reminders</Button>
            </div>
            <div className="rounded-lg border max-h-[55vh] overflow-y-auto scroll-thin">
              <Table>
                <TableHeader className="sticky top-0 bg-card"><TableRow>
                  <TableHead>Student</TableHead><TableHead>Class</TableHead><TableHead className="text-right">Total Dues</TableHead><TableHead>Last Payment</TableHead><TableHead className="text-right">Action</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(invoices || []).filter(i => i.status === 'Overdue' || i.status === 'Unpaid').slice(0, 50).map(inv => (
                    <TableRow key={inv.id} className="bg-rose-500/5">
                      <TableCell><div className="text-sm font-medium">{inv.studentName}</div><div className="text-[11px] text-muted-foreground font-mono">{inv.admissionNo}</div></TableCell>
                      <TableCell><Badge variant="outline">{inv.className}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-rose-600">₹{inv.balance.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{inv.paymentDate ? new Date(inv.paymentDate).toLocaleDateString('en-IN') : 'Never'}</TableCell>
                      <TableCell className="text-right"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPayInvoice(inv)}>{canPay && !canCollect ? 'Pay' : 'Collect'}</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* Fee structures tab */}
        <TabsContent value="structures" className="mt-4">
          <Card><CardContent className="p-4">
            <SectionHeader title="Fee Structure by Class" description="Annual fee configuration for academic year 2026-27" action={canCreate ? <Button size="sm" variant="outline" onClick={() => toast.info('Open fee structure editor')}><FileText className="size-4 mr-1.5" /> Add Structure</Button> : undefined} />
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader><TableRow><TableHead>Class</TableHead><TableHead>Fee Type</TableHead><TableHead>Frequency</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Due Date</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(structures || []).map(s => (
                    <TableRow key={s.id}>
                      <TableCell><Badge variant="outline">{s.className}</Badge></TableCell>
                      <TableCell className="text-sm">{s.name}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{s.frequency}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums font-medium">₹{s.amount.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.dueDate ? new Date(s.dueDate).toLocaleDateString('en-IN') : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* Accounting tab */}
        <TabsContent value="accounting" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card><CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Building2 className="size-4 text-primary" /> Ledger Summary</h3>
              <div className="space-y-3">
                {[
                  { label: 'Fee Income — Tuition', amount: (summary?.collected ?? 0) * 0.55, type: 'credit' },
                  { label: 'Fee Income — Transport', amount: (summary?.collected ?? 0) * 0.2, type: 'credit' },
                  { label: 'Fee Income — Admission', amount: (summary?.collected ?? 0) * 0.1, type: 'credit' },
                  { label: 'Fee Income — Other', amount: (summary?.collected ?? 0) * 0.15, type: 'credit' },
                  { label: 'Salary Expense', amount: -1850000, type: 'debit' },
                  { label: 'Utility & Maintenance', amount: -245000, type: 'debit' },
                  { label: 'Transport Operations', amount: -180000, type: 'debit' },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                    <span>{r.label}</span>
                    <span className={`tabular-nums font-medium ${r.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {r.type === 'credit' ? '+' : ''}{fmtINR(Math.abs(r.amount))}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm font-bold pt-2">
                  <span>Net Balance</span>
                  <span className="text-emerald-600 tabular-nums">{fmtINR((summary?.collected ?? 0) - 2275000)}</span>
                </div>
              </div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><FileText className="size-4 text-primary" /> Tally / Accounting Export</h3>
              <p className="text-xs text-muted-foreground mb-4">Sync vouchers with Tally Prime, Zoho Books, or export as standard XML/CSV for your accountant.</p>
              <div className="space-y-2">
                {['Tally Prime XML Export','Zoho Books Sync','QuickBooks Export','Day Book (PDF)','Trial Balance','Balance Sheet'].map(opt => (
                  <Button key={opt} variant="outline" className="w-full justify-start h-10" onClick={() => toast.info(`${opt} — generating…`)}>
                    <FileText className="size-4 mr-2" /> {opt}
                  </Button>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span className="text-sm font-medium">Auto-sync enabled</span>
                </div>
                <p className="text-xs text-muted-foreground">Every fee receipt auto-creates a Tally voucher. Last sync: just now.</p>
              </div>
            </CardContent></Card>
          </div>
        </TabsContent>
      </Tabs>

      {payInvoice && <PaymentDialog invoice={payInvoice} onClose={() => setPayInvoice(null)} onPay={(amount, method) => payMut.mutate({ id: payInvoice.id, data: { paidAmount: amount, paymentMethod: method } })} loading={payMut.isPending} />}
    </div>
  )
}

function PaymentDialog({ invoice, onClose, onPay, loading }: { invoice: FeeInvoice; onClose: () => void; onPay: (amount: number, method: string) => void; loading: boolean }) {
  const [amount, setAmount] = useState(String(invoice.balance))
  const [method, setMethod] = useState('Cash')

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Receipt className="size-5 text-primary" /> Collect Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="p-3 rounded-lg bg-muted">
            <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Student</span><span className="font-medium">{invoice.studentName}</span></div>
            <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Invoice</span><span className="font-mono text-xs">{invoice.invoiceNo}</span></div>
            <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Fee</span><span>{invoice.feeName}</span></div>
            <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Total Amount</span><span className="tabular-nums">₹{invoice.amount.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Already Paid</span><span className="tabular-nums text-emerald-600">₹{invoice.paidAmount.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between text-sm font-semibold pt-1 border-t mt-1"><span>Balance Due</span><span className="tabular-nums text-rose-600">₹{invoice.balance.toLocaleString('en-IN')}</span></div>
          </div>
          <div>
            <Label>Payment Amount</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-1.5 mt-2">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAmount(String(invoice.balance))}>Full</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAmount(String(Math.round(invoice.balance / 2)))}>Half</Button>
            </div>
          </div>
          <div>
            <Label>Payment Method</Label>
            <div className="grid grid-cols-4 gap-2">
              {['Cash','Card','Online','UPI'].map(m => {
                const Icon = METHOD_ICONS[m]
                return (
                  <button key={m} onClick={() => setMethod(m)} className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs ${method === m ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted'}`}>
                    <Icon className="size-4" /> {m}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!amount || Number(amount) <= 0 || loading} onClick={() => onPay(Number(amount), method)}>
            {loading ? 'Processing…' : `Collect ₹${Number(amount).toLocaleString('en-IN')}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
