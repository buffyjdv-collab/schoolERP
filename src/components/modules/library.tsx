'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Book, LibraryIssue, Student } from '@/lib/types'
import { useCan } from '@/lib/store'
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
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  BookOpen, BookCheck, BookMarked, AlertTriangle, Search, Library,
  RotateCcw, UserCheck, Hash, MapPin, IndianRupee, X,
} from 'lucide-react'
import { toast } from 'sonner'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

// ============ Issue Book Dialog ============
function IssueBookDialog({ book, open, onOpenChange }: { book: Book | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient()
  const [studentId, setStudentId] = useState('')
  const [q, setQ] = useState('')

  const { data: students, isLoading } = useQuery({
    queryKey: ['students', 'list'],
    queryFn: () => api.students.list(),
  })

  const issueMut = useMutation({
    mutationFn: (vars: { bookId: string; studentId: string }) => api.library.issue(vars),
    onSuccess: () => {
      toast.success('Book issued', { description: `${book?.title} has been issued to the student.` })
      qc.invalidateQueries({ queryKey: ['library', 'issues'] })
      qc.invalidateQueries({ queryKey: ['library', 'books'] })
      onOpenChange(false)
      setStudentId('')
      setQ('')
    },
    onError: (e: any) => toast.error('Failed to issue book', { description: e?.message }),
  })

  const filtered = (students || []).filter((s) => {
    if (!q) return true
    const ss = q.toLowerCase()
    return s.fullName.toLowerCase().includes(ss) || s.admissionNo.toLowerCase().includes(ss) || (s.className || '').toLowerCase().includes(ss)
  })

  const selected = (students || []).find((s) => s.id === studentId)

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setStudentId(''); setQ('') } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><BookMarked className="size-4 text-primary" /> Issue Book</DialogTitle>
          <DialogDescription>
            {book && (
              <span className="block mt-1">
                <span className="font-medium text-foreground">{book.title}</span>
                <span className="text-xs"> · {book.author} · Acc #{book.accessionNo}</span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Label>Search & select student</Label>
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, admission no, class…" className="pl-9" />
          </div>

          {selected ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{selected.fullName}</p>
                <p className="text-xs text-muted-foreground">{selected.admissionNo} · {selected.className || '-'} {selected.sectionName ? `· ${selected.sectionName}` : ''}</p>
              </div>
              <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={() => setStudentId('')}><X className="size-3.5" /></Button>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto scroll-thin rounded-lg border">
              {isLoading ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState icon={UserCheck} title="No students found" description="Try a different search." />
              ) : (
                filtered.slice(0, 60).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStudentId(s.id)}
                    className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-b last:border-0 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.fullName}</p>
                      <p className="text-xs text-muted-foreground">{s.admissionNo} · {s.className || '-'} {s.sectionName ? `· ${s.sectionName}` : ''}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{s.status}</Badge>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button
            disabled={!book || !selected || issueMut.isPending}
            onClick={() => book && selected && issueMut.mutate({ bookId: book.id, studentId: selected.id })}
            className="gap-1.5"
          >
            <BookCheck className="size-4" /> Issue Book
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ Catalog tab ============
function CatalogTab() {
  const canIssue = useCan()('library', 'issue')
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [issueBook, setIssueBook] = useState<Book | null>(null)
  const [issueOpen, setIssueOpen] = useState(false)

  // Lightweight debounce (avoids set-state-in-effect)
  const { data: books, isLoading } = useQuery({
    queryKey: ['library', 'books', debouncedQ],
    queryFn: () => api.library.books(debouncedQ || undefined),
  })

  const onSearch = (v: string) => {
    setQ(v)
    // schedule debounced update via setTimeout closure
    window.clearTimeout((onSearch as any)._t)
    ;(onSearch as any)._t = window.setTimeout(() => setDebouncedQ(v.trim()), 350)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><BookOpen className="size-4 text-primary" /> Book Catalog</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{books?.length ?? 0} titles{q ? ` matching "${q}"` : ''}</p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Search title, author, accession no, ISBN…" className="pl-9" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {isLoading ? (
          <div className="px-6 pb-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !books || books.length === 0 ? (
          <div className="px-6 pb-4"><EmptyState icon={BookOpen} title="No books found" description={q ? 'Try a different search term.' : 'The catalog will appear here once books are added.'} /></div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-28">Accession</TableHead>
                  <TableHead className="min-w-[200px]">Title & Author</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="text-center">Available</TableHead>
                  <TableHead className="hidden lg:table-cell">Rack</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Price</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {books.map((b) => {
                  const out = b.available <= 0
                  return (
                    <TableRow key={b.id} className="hover:bg-accent/50">
                      <TableCell className="font-mono text-xs">{b.accessionNo}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm leading-tight">{b.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{b.author}{b.publisher ? ` · ${b.publisher}` : ''}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell"><Badge variant="outline" className="text-[10px]">{b.category}</Badge></TableCell>
                      <TableCell className="text-center">
                        <span className={`text-xs font-medium ${out ? 'text-rose-600' : b.available <= 1 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {b.available}/{b.totalCopies}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{b.rack || '—'}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell text-xs tabular-nums">{fmtINR(b.price)}</TableCell>
                      <TableCell className="text-right">
                        {canIssue ? (
                          <Button
                            size="sm"
                            variant={out ? 'outline' : 'default'}
                            disabled={out}
                            className="gap-1.5 h-8"
                            onClick={() => { setIssueBook(b); setIssueOpen(true) }}
                          >
                            <BookMarked className="size-3.5" /> {out ? 'Unavailable' : 'Issue'}
                          </Button>
                        ) : out ? (
                          <span className="text-xs text-rose-600">Unavailable</span>
                        ) : (
                          <span className="text-xs text-emerald-600">Available</span>
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

      {canIssue && (
        <IssueBookDialog book={issueBook} open={issueOpen} onOpenChange={setIssueOpen} />
      )}
    </Card>
  )
}

// ============ Issued Books tab ============
function IssuedTab() {
  const canReturn = useCan()('library', 'return')
  const qc = useQueryClient()
  const { data: issues, isLoading } = useQuery({ queryKey: ['library', 'issues'], queryFn: api.library.issues })

  const returnMut = useMutation({
    mutationFn: (id: string) => api.library.return(id),
    onSuccess: (data) => {
      toast.success('Book returned', { description: data.fine > 0 ? `Late return fine: ${fmtINR(data.fine)}` : 'Returned within due date.' })
      qc.invalidateQueries({ queryKey: ['library', 'issues'] })
      qc.invalidateQueries({ queryKey: ['library', 'books'] })
    },
    onError: () => toast.error('Failed to return book'),
  })

  const now = Date.now()

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><RotateCcw className="size-4 text-primary" /> Issued Books</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Currently issued & recently returned books. Overdue rows are highlighted.</p>
      </CardHeader>
      <CardContent className="px-0">
        {isLoading ? (
          <div className="px-6 pb-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !issues || issues.length === 0 ? (
          <div className="px-6 pb-4"><EmptyState icon={BookCheck} title="No issues recorded" description="Issued books will appear here." /></div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="min-w-[200px]">Book</TableHead>
                  <TableHead className="min-w-[180px]">Student</TableHead>
                  <TableHead className="hidden sm:table-cell">Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Fine</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((it) => {
                  const overdue = it.status === 'Issued' && new Date(it.dueDate).getTime() < now
                  return (
                    <TableRow key={it.id} className={`hover:bg-accent/50 ${overdue ? 'bg-rose-500/5 hover:bg-rose-500/10' : ''}`}>
                      <TableCell>
                        <div className="font-medium text-sm leading-tight">{it.bookTitle}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 font-mono">#{it.accessionNo}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{it.studentName}</div>
                        <div className="text-xs text-muted-foreground">{it.admissionNo}</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">{fmtDate(it.issueDate)}</TableCell>
                      <TableCell className="text-xs">
                        {fmtDate(it.dueDate)}
                        {overdue && <Badge variant="outline" className="ml-1 text-[10px] bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30">Overdue</Badge>}
                      </TableCell>
                      <TableCell><StatusBadge status={it.status} /></TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {it.fine > 0 ? <span className="text-rose-600 font-medium">{fmtINR(it.fine)}</span> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {it.status === 'Issued' ? (
                          canReturn ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={returnMut.isPending}
                              onClick={() => returnMut.mutate(it.id)}
                              className="gap-1.5 h-8"
                            >
                              <RotateCcw className="size-3.5" /> Return
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Issued</span>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">{it.returnDate ? fmtDate(it.returnDate) : '—'}</span>
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

// ============ Main module ============
export function LibraryModule() {
  const { data: books, isLoading: booksLoading } = useQuery({ queryKey: ['library', 'books', ''], queryFn: () => api.library.books() })
  const { data: issues, isLoading: issuesLoading } = useQuery({ queryKey: ['library', 'issues'], queryFn: api.library.issues })

  const totalBooks = books?.reduce((s, b) => s + b.totalCopies, 0) ?? 0
  const availableNow = books?.reduce((s, b) => s + b.available, 0) ?? 0
  const issuedCount = issues?.filter((i) => i.status === 'Issued').length ?? 0
  const overdueCount = issues?.filter((i) => i.status === 'Issued' && new Date(i.dueDate).getTime() < Date.now()).length ?? 0
  const withFine = issues?.filter((i) => i.fine > 0).length ?? 0

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Library Management"
        description="Catalog, issue/return tracking and overdue monitoring for the school library."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Books" value={totalBooks} sub={`${books?.length ?? 0} unique titles`} icon={Library} accent="primary" loading={booksLoading} />
        <StatCard label="Available Now" value={availableNow} sub="Ready to issue" icon={BookOpen} accent="emerald" loading={booksLoading} />
        <StatCard label="Issued" value={issuedCount} sub="Currently out" icon={BookMarked} accent="amber" loading={issuesLoading} />
        <StatCard label="Overdue / Fined" value={overdueCount} sub={`${withFine} with fine`} icon={AlertTriangle} accent="rose" loading={issuesLoading} />
      </div>

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog" className="gap-1.5"><BookOpen className="size-4" /> Catalog</TabsTrigger>
          <TabsTrigger value="issued" className="gap-1.5"><RotateCcw className="size-4" /> Issued Books</TabsTrigger>
        </TabsList>
        <TabsContent value="catalog" className="mt-4"><CatalogTab /></TabsContent>
        <TabsContent value="issued" className="mt-4"><IssuedTab /></TabsContent>
      </Tabs>
    </div>
  )
}
