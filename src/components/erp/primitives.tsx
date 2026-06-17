'use client'

import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { LucideIcon } from 'lucide-react'

export function StatCard({
  label, value, sub, icon: Icon, accent = 'primary', loading, trend,
}: {
  label: string
  value: string | number
  sub?: string
  icon: LucideIcon
  accent?: 'primary' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky'
  loading?: boolean
  trend?: { value: string; up: boolean }
}) {
  const accentMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  }
  if (loading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </Card>
    )
  }
  return (
    <Card className="p-5 relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-1.5 tabular-nums truncate">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          {trend && (
            <span className={cn('inline-flex items-center gap-0.5 text-[11px] font-medium mt-1.5', trend.up ? 'text-emerald-600' : 'text-rose-600')}>
              {trend.up ? '▲' : '▼'} {trend.value}
            </span>
          )}
        </div>
        <div className={cn('size-10 rounded-xl grid place-items-center shrink-0', accentMap[accent])}>
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  )
}

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Paid: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    Unpaid: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
    Partial: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    Overdue: 'bg-rose-600/15 text-rose-800 dark:text-rose-300',
    Present: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    Absent: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
    Late: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    Leave: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
    HalfDay: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
    Active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    Inactive: 'bg-muted text-muted-foreground',
    Alumni: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
    Pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    HODApproved: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
    PrincipalApproved: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    Rejected: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
    Approved: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    Processed: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
    Issued: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    Returned: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    Moving: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    Idle: 'bg-muted text-muted-foreground',
    Stopped: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    Maintenance: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
    Enquiry: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
    Application: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
    Test: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    Interview: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    Submitted: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
    Verified: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    TestScheduled: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    Scheduled: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
    Completed: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    Sent: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    Queued: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    Failed: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
    Good: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    Damaged: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
    'Under Repair': 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', map[status] || 'bg-muted text-muted-foreground')}>
      {status}
    </span>
  )
}

export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="size-12 rounded-full bg-muted grid place-items-center mb-3">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <p className="font-medium text-sm">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>}
    </div>
  )
}
