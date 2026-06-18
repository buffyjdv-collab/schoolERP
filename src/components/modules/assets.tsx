'use client'

import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Asset } from '@/lib/types'
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
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableFooter,
} from '@/components/ui/table'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Package, Wrench, IndianRupee, Search, Boxes, MapPin, User, Plus, Pencil, Trash2,
} from 'lucide-react'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { toast } from 'sonner'

function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function fmtINRShort(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n}`
}

const CONDITION_LABEL: Record<string, string> = {
  Good: 'Good',
  Damaged: 'Damaged',
  'Under Repair': 'Under Repair',
}

const ASSET_CONDITIONS = ['Good', 'Damaged', 'Under Repair'] as const

const CHART_COLORS = ['#10b981', '#14b8a6', '#f59e0b', '#f43f5e', '#8b5cf6', '#0ea5e9', '#84cc16', '#ec4899']

// ============ Asset Row (flat view) ============
function AssetRow({ a, canEdit, canDelete, onEdit, onDelete }: { a: Asset; canEdit: boolean; canDelete: boolean; onEdit: () => void; onDelete: () => void }) {
  const canRowActions = canEdit || canDelete
  return (
    <TableRow
      className={`hover:bg-accent/50 cursor-pointer ${a.condition === 'Damaged' ? 'bg-rose-500/5' : a.condition === 'Under Repair' ? 'bg-amber-500/5' : ''}`}
      onClick={() => toast.info(a.name, { description: `${a.assetCode} · ${a.category} · ${fmtINR(a.purchaseValue)}` })}
    >
      <TableCell className="font-mono text-xs">{a.assetCode}</TableCell>
      <TableCell>
        <div className="text-sm font-medium leading-tight">{a.name}</div>
      </TableCell>
      <TableCell className="hidden md:table-cell"><Badge variant="outline" className="text-[10px]">{a.category}</Badge></TableCell>
      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
        {a.location ? <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {a.location}</span> : '—'}
      </TableCell>
      <TableCell className="text-right text-xs tabular-nums">{fmtINR(a.purchaseValue)}</TableCell>
      <TableCell><StatusBadge status={CONDITION_LABEL[a.condition] || a.condition} /></TableCell>
      <TableCell className="hidden sm:table-cell text-xs">
        {a.assignedTo ? <span className="inline-flex items-center gap-1"><User className="size-3" /> {a.assignedTo}</span> : <span className="text-muted-foreground">—</span>}
      </TableCell>
      {canRowActions && (
        <TableCell className="text-right" onClick={(ev) => ev.stopPropagation()}>
          <div className="flex justify-end gap-1">
            {canEdit && (
              <Button size="icon" variant="ghost" className="size-7" title="Edit asset" onClick={onEdit}>
                <Pencil className="size-3.5" />
              </Button>
            )}
            {canDelete && (
              <Button size="icon" variant="ghost" className="size-7 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10" title="Delete asset" onClick={onDelete}>
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
  )
}

// ============ Main module ============
export function AssetsModule() {
  const qc = useQueryClient()
  const canCreate = useCan()('assets', 'create')
  const canEdit = useCan()('assets', 'edit')
  const canDelete = useCan()('assets', 'delete')
  const { data: assets, isLoading } = useQuery({ queryKey: ['assets', 'list'], queryFn: api.assets.list })

  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [cond, setCond] = useState('all')
  const [groupByCat, setGroupByCat] = useState(false)
  const [formDialog, setFormDialog] = useState<{ mode: 'create' | 'edit'; target?: Asset } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null)

  const createMut = useMutation({
    mutationFn: (data: any) => api.assets.create(data),
    onSuccess: () => {
      toast.success('Asset added', { description: 'The new asset has been registered.' })
      qc.invalidateQueries({ queryKey: ['assets', 'list'] })
      setFormDialog(null)
    },
    onError: () => toast.error('Failed to add asset'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.assets.update(id, data),
    onSuccess: () => {
      toast.success('Asset updated', { description: 'The asset record has been saved.' })
      qc.invalidateQueries({ queryKey: ['assets', 'list'] })
      setFormDialog(null)
    },
    onError: () => toast.error('Failed to update asset'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.assets.remove(id),
    onSuccess: () => {
      toast.success('Asset deleted', { description: 'The asset has been removed from the register.' })
      qc.invalidateQueries({ queryKey: ['assets', 'list'] })
      setDeleteTarget(null)
    },
    onError: () => toast.error('Failed to delete asset'),
  })

  const categories = useMemo(() => Array.from(new Set((assets || []).map((a) => a.category))).sort(), [assets])

  const filtered = useMemo(() => (assets || []).filter((a) => {
    if (cat !== 'all' && a.category !== cat) return false
    if (cond !== 'all' && a.condition !== cond) return false
    if (!q) return true
    const s = q.toLowerCase()
    return a.name.toLowerCase().includes(s) || a.assetCode.toLowerCase().includes(s) || (a.location || '').toLowerCase().includes(s) || (a.assignedTo || '').toLowerCase().includes(s)
  }), [assets, q, cat, cond])

  const totalAssets = assets?.length ?? 0
  const totalValue = assets?.reduce((s, a) => s + a.purchaseValue, 0) ?? 0
  const goodCount = assets?.filter((a) => a.condition === 'Good').length ?? 0
  const repairCount = assets?.filter((a) => a.condition === 'Damaged' || a.condition === 'Under Repair').length ?? 0

  // chart data — asset value by category
  const chartData = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of assets || []) map.set(a.category, (map.get(a.category) || 0) + a.purchaseValue)
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [assets])

  // grouped view data
  const grouped = useMemo(() => {
    const map = new Map<string, Asset[]>()
    for (const a of filtered) {
      const arr = map.get(a.category) || []
      arr.push(a)
      map.set(a.category, arr)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  const canRowActions = canEdit || canDelete

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Assets & Inventory"
        description="Track school assets — furniture, IT equipment, lab apparatus and more — with valuation and condition."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Assets" value={totalAssets} sub={`${categories.length} categories`} icon={Package} accent="primary" loading={isLoading} />
        <StatCard label="Total Value" value={fmtINRShort(totalValue)} sub="Purchase value" icon={IndianRupee} accent="emerald" loading={isLoading} />
        <StatCard label="In Good Condition" value={goodCount} sub={`${totalAssets ? Math.round((goodCount / totalAssets) * 100) : 0}% of total`} icon={Boxes} accent="sky" loading={isLoading} />
        <StatCard label="Needs Repair" value={repairCount} sub="Damaged / Under repair" icon={Wrench} accent="rose" loading={isLoading} />
      </div>

      {/* Asset value by category chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Boxes className="size-4 text-primary" /> Asset Value by Category</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Total purchase value grouped by asset category.</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : chartData.length === 0 ? (
            <EmptyState icon={Boxes} title="No assets" description="Asset valuation will appear here once assets are added." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ left: -10, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickFormatter={(v: number) => fmtINRShort(v)} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => fmtINR(v)}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Value">
                  {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Asset table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><Package className="size-4 text-primary" /> Asset Register</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{filtered.length} of {assets?.length ?? 0} assets</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <Select value={cat} onValueChange={setCat}>
                <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={cond} onValueChange={setCond}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Condition" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Conditions</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Damaged">Damaged</SelectItem>
                  <SelectItem value="Under Repair">Under Repair</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-64">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, code, location…" className="pl-9" />
              </div>
              <Button
                variant={groupByCat ? 'default' : 'outline'}
                onClick={() => setGroupByCat((v) => !v)}
                className="gap-1.5 shrink-0"
                title="Toggle grouping by category"
              >
                <Boxes className="size-4" /> Group
              </Button>
              {canCreate && (
                <Button className="gap-1.5 shrink-0" onClick={() => setFormDialog({ mode: 'create' })}>
                  <Plus className="size-4" /> <span className="hidden lg:inline">Add Asset</span><span className="lg:hidden">Add</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {isLoading ? (
            <div className="px-6 pb-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 pb-4"><EmptyState icon={Package} title="No assets found" description={q || cat !== 'all' || cond !== 'all' ? 'Try a different filter.' : 'Assets will appear here.'} /></div>
          ) : groupByCat ? (
            <div className="max-h-[60vh] overflow-y-auto scroll-thin divide-y">
              {grouped.map(([category, items]) => {
                const subtotal = items.reduce((s, a) => s + a.purchaseValue, 0)
                return (
                  <div key={category}>
                    <div className="sticky top-0 bg-muted/70 backdrop-blur px-4 py-2.5 flex items-center justify-between gap-2 z-10 border-b">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">{category}</Badge>
                        <span className="text-xs text-muted-foreground">{items.length} asset{items.length !== 1 ? 's' : ''}</span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums">{fmtINR(subtotal)}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
                      {items.map((a) => (
                        <div
                          key={a.id}
                          className="bg-card p-3 hover:bg-accent/50 cursor-pointer transition-colors"
                          onClick={() => toast.info(a.name, { description: `${a.assetCode} · ${fmtINR(a.purchaseValue)}` })}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{a.name}</p>
                              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{a.assetCode}</p>
                            </div>
                            <StatusBadge status={CONDITION_LABEL[a.condition] || a.condition} />
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {a.location ? <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {a.location}</span> : '—'}
                            </span>
                            <span className="text-xs font-semibold tabular-nums">{fmtINR(a.purchaseValue)}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            {a.assignedTo ? (
                              <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><User className="size-3" /> {a.assignedTo}</p>
                            ) : <span />}
                            {canRowActions && (
                              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                {canEdit && (
                                  <Button size="icon" variant="ghost" className="size-6" title="Edit asset" onClick={() => setFormDialog({ mode: 'edit', target: a })}>
                                    <Pencil className="size-3" />
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button size="icon" variant="ghost" className="size-6 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10" title="Delete asset" onClick={() => setDeleteTarget(a)}>
                                    <Trash2 className="size-3" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto scroll-thin">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-28">Asset Code</TableHead>
                    <TableHead className="min-w-[180px]">Name</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead className="hidden lg:table-cell">Location</TableHead>
                    <TableHead className="text-right">Purchase Value</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead className="hidden sm:table-cell">Assigned To</TableHead>
                    {canRowActions && <TableHead className="text-right w-24">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <AssetRow
                      key={a.id}
                      a={a}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      onEdit={() => setFormDialog({ mode: 'edit', target: a })}
                      onDelete={() => setDeleteTarget(a)}
                    />
                  ))}
                </TableBody>
                <TableFooter className="sticky bottom-0 bg-muted/50 backdrop-blur">
                  <TableRow className="font-semibold">
                    <TableCell colSpan={canRowActions ? 8 : 7} className="text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span>Total ({filtered.length} assets)</span>
                        <span className="font-bold tabular-nums">{fmtINR(filtered.reduce((s, a) => s + a.purchaseValue, 0))}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {formDialog && (
        <AssetFormDialog
          key={formDialog.mode === 'edit' ? formDialog.target?.id : 'create'}
          mode={formDialog.mode}
          target={formDialog.target}
          categories={categories}
          loading={createMut.isPending || updateMut.isPending}
          onClose={() => setFormDialog(null)}
          onSubmit={(data) => {
            if (formDialog.mode === 'edit' && formDialog.target) {
              updateMut.mutate({ id: formDialog.target.id, data })
            } else {
              createMut.mutate(data)
            }
          }}
        />
      )}

      {deleteTarget && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete asset?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <strong>{deleteTarget.name}</strong> ({deleteTarget.assetCode}) — {deleteTarget.category}, {fmtINR(deleteTarget.purchaseValue)}. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => deleteMut.mutate(deleteTarget.id)}
                disabled={deleteMut.isPending}
              >
                {deleteMut.isPending ? 'Deleting…' : 'Yes, delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

// ============ Asset Create/Edit Dialog ============
function AssetFormDialog({
  mode, target, categories, loading, onClose, onSubmit,
}: {
  mode: 'create' | 'edit'
  target?: Asset
  categories: string[]
  loading: boolean
  onClose: () => void
  onSubmit: (data: any) => void
}) {
  const [name, setName] = useState(target?.name ?? '')
  const [category, setCategory] = useState(target?.category ?? (categories[0] || 'IT Equipment'))
  const [location, setLocation] = useState(target?.location ?? '')
  const [purchaseValue, setPurchaseValue] = useState(target ? String(target.purchaseValue) : '')
  const [condition, setCondition] = useState<string>(target?.condition ?? 'Good')
  const [assignedTo, setAssignedTo] = useState(target?.assignedTo ?? '')

  const valid = name.trim() && category.trim() && Number(purchaseValue) >= 0

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="size-4 text-primary" />
            {mode === 'create' ? 'Add Asset' : 'Edit Asset'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Register a new school asset. Fields marked with * are required.' : `Update details for ${target?.name}.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="as-name">Asset Name *</Label>
            <Input id="as-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dell OptiPlex Desktop" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {Array.from(new Set([...categories, 'IT Equipment', 'Furniture', 'Lab Equipment', 'Library', 'Sports', 'Office'])).sort().map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="as-loc">Location</Label>
              <Input id="as-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lab 2 / Staff Room" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="as-val">Purchase Value (₹) *</Label>
              <Input id="as-val" type="number" min="0" value={purchaseValue} onChange={(e) => setPurchaseValue(e.target.value)} placeholder="25000" />
            </div>
            <div className="space-y-1.5">
              <Label>Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSET_CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="as-asg">Assigned To</Label>
            <Input id="as-asg" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Mr. Ravi / Lab Assistant / —" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!valid || loading}
            onClick={() => onSubmit({
              name: name.trim(),
              category: category.trim(),
              location: location.trim() || undefined,
              purchaseValue: Number(purchaseValue),
              condition,
              assignedTo: assignedTo.trim() || undefined,
            })}
          >
            {loading ? 'Saving…' : mode === 'create' ? 'Create Asset' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
