'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import {
  PERMISSIONS, ROLE_LABELS, ROLE_DESCRIPTIONS, MODULE_LABELS, MODULE_DESCRIPTIONS,
  MODULE_ACTIONS, ACTION_LABELS, ALL_MODULES, SCOPE_LABELS,
} from '@/lib/rbac'
import type { Role, ModuleId, Action, DataScope } from '@/lib/rbac'
import {
  ShieldCheck, Users, Search, ChevronRight, Lock, Unlock, RotateCcw, Save,
  UserCircle, Mail, Calendar, Power, AlertTriangle, Check, X, Info, UsersRound,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useState, useMemo } from 'react'
import { toast } from 'sonner'

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  admin: 'bg-primary/15 text-primary',
  transport_manager: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  teacher: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
  student: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  parent: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
}

interface UserRow {
  id: string; email: string; name: string; role: Role; active: boolean
  lastLogin: string | null; createdAt: string
  teacherClassCount: number; childrenCount: number
  overrides: Record<string, any>
}

export function UserManagementModule() {
  const [tab, setTab] = useState('users')

  return (
    <div className="space-y-5">
      {/* Header banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-primary text-white p-5">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="relative flex items-center gap-3">
          <ShieldCheck className="size-8" />
          <div className="flex-1">
            <h2 className="text-lg font-bold">Advanced Access Control</h2>
            <p className="text-sm opacity-90">
              Manage roles, assign/de-assign modules, customize CRUD permissions, and set data restrictions
              at the role level (applies to all users of that role) or per individual user.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="users" className="gap-1.5"><Users className="size-3.5" /> User Management</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5"><UsersRound className="size-3.5" /> Role Management</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
        <TabsContent value="roles" className="mt-4"><RolesTab /></TabsContent>
      </Tabs>
    </div>
  )
}

function UsersTab() {
  const { user: currentUser } = useStore()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: api.admin.users,
    enabled: currentUser?.role === 'super_admin',
  })

  const users = (data?.users || []) as UserRow[]
  const filtered = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Users" value={users.length} icon={Users} />
        <SummaryCard label="Active" value={users.filter(u => u.active).length} icon={Power} accent="text-emerald-600" />
        <SummaryCard label="With Overrides" value={users.filter(u => Object.keys(u.overrides).length > 0).length} icon={Lock} accent="text-amber-600" />
        <SummaryCard label="Roles" value={Object.keys(ROLE_LABELS).length} icon={ShieldCheck} accent="text-violet-600" />
      </div>

      {/* User list + permission editor */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="size-4 text-primary" /> Users
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-4 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Search by name, email, role…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
              </div>
            </div>
            <ScrollArea className="h-[60vh]">
              <div className="px-2 pb-2 space-y-1">
                {isLoading ? Array.from({length: 5}).map((_,i) => <Skeleton key={i} className="h-16 w-full" />) :
                  filtered.map(u => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedId(u.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${selectedId === u.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className={`text-xs ${ROLE_COLORS[u.role] || 'bg-muted'}`}>
                            {u.name.split(' ').map(n=>n[0]).slice(0,2).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{u.name}</span>
                            {!u.active && <Badge variant="destructive" className="text-[9px] h-4">Inactive</Badge>}
                            {Object.keys(u.overrides).length > 0 && <Badge className="text-[9px] h-4 bg-amber-500/15 text-amber-700">Custom</Badge>}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge className={`text-[9px] h-4 ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</Badge>
                            {u.role === 'teacher' && <span className="text-[10px] text-muted-foreground">{u.teacherClassCount} classes</span>}
                            {u.role === 'parent' && <span className="text-[10px] text-muted-foreground">{u.childrenCount} children</span>}
                          </div>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                      </div>
                    </button>
                  ))
                }
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          {selectedId ? (
            <PermissionEditor userId={selectedId} onClose={() => setSelectedId(null)} />
          ) : (
            <Card className="h-full grid place-items-center">
              <CardContent className="p-8 text-center">
                <ShieldCheck className="size-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium">Select a user to manage permissions</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Customize module access, CRUD actions, and data restrictions for any user.
                  Changes override their role defaults.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// ============ Role Management Tab ============

function RolesTab() {
  const [selectedRole, setSelectedRole] = useState<string>('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: api.admin.roles,
  })

  const roles = data?.roles || []
  const selected = roles.find(r => r.role === selectedRole)

  return (
    <div className="space-y-4">
      {/* Role cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {isLoading ? Array.from({length: 5}).map((_,i) => <Skeleton key={i} className="h-28" />) :
          roles.map(r => (
            <button
              key={r.role}
              onClick={() => setSelectedRole(r.role)}
              className={`text-left p-4 rounded-xl border transition-all ${selectedRole === r.role ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/40'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`size-8 rounded-lg grid place-items-center ${ROLE_COLORS[r.role]}`}>
                  <UsersRound className="size-4" />
                </div>
                <div className="text-sm font-semibold">{r.label}</div>
              </div>
              <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">{r.description}</p>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">{r.userCount} users</span>
                <Badge variant="outline" className="text-[9px]">{r.moduleCount}/{ALL_MODULES.length} modules</Badge>
              </div>
            </button>
          ))
        }
      </div>

      {/* Permission matrix editor for selected role */}
      {selected ? (
        <RolePermissionEditor role={selected} />
      ) : (
        <Card className="grid place-items-center py-12">
          <CardContent className="text-center">
            <UsersRound className="size-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium">Select a role to customize its permissions</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Changes apply to ALL users with that role. Individual user overrides take precedence over role defaults.
              Super Admin role is locked and cannot be modified.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function RolePermissionEditor({ role }: { role: any }) {
  const qc = useQueryClient()
  const [overrides, setOverrides] = useState<Record<string, any>>({})
  const [loaded, setLoaded] = useState(false)

  const { data } = useQuery({
    queryKey: ['role-perms', role.role],
    queryFn: () => api.admin.getRolePermissions(role.role),
  })

  if (data && !loaded) {
    setOverrides(data.overrides || {})
    setLoaded(true)
  }

  const saveMut = useMutation({
    mutationFn: (ov: any) => api.admin.saveRolePermissions(role.role, ov),
    onSuccess: () => {
      toast.success(`Permissions saved for ${ROLE_LABELS[role.role as Role]}`, { description: 'All users with this role are affected immediately.' })
      qc.invalidateQueries({ queryKey: ['admin-roles'] })
      qc.invalidateQueries({ queryKey: ['role-perms', role.role] })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (e: any) => toast.error('Failed: ' + e.message),
  })

  const resetMut = useMutation({
    mutationFn: () => api.admin.resetRolePermissions(role.role),
    onSuccess: () => {
      toast.success(`Reset to default for ${ROLE_LABELS[role.role as Role]}`)
      setOverrides({})
      qc.invalidateQueries({ queryKey: ['admin-roles'] })
      qc.invalidateQueries({ queryKey: ['role-perms', role.role] })
    },
  })

  const updateOverride = (module: string, field: string, value: any) => {
    setOverrides(prev => {
      const cur = { ...prev[module] } || {}
      cur[field] = value
      return { ...prev, [module]: cur }
    })
  }

  const roleKey = role.role as Role
  const staticDefaults = PERMISSIONS[roleKey] || {}

  return (
    <Card className="flex flex-col">
      {/* Role header */}
      <div className={`p-4 border-b bg-gradient-to-r ${role.role === 'admin' ? 'from-primary/5' : role.role === 'transport_manager' ? 'from-teal-500/5' : role.role === 'teacher' ? 'from-cyan-500/5' : role.role === 'student' ? 'from-amber-500/5' : 'from-sky-500/5'} to-transparent`}>
        <div className="flex items-center gap-3">
          <div className={`size-10 rounded-xl grid place-items-center ${ROLE_COLORS[role.role]}`}>
            <UsersRound className="size-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base">{ROLE_LABELS[roleKey]}</h3>
              <Badge variant="outline" className="text-[10px]">{role.userCount} users</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[roleKey]}</p>
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => resetMut.mutate()} disabled={resetMut.isPending}>
              <RotateCcw className="size-3" /> Reset
            </Button>
            <Button size="sm" className="h-7 text-xs gap-1" onClick={() => saveMut.mutate(overrides)} disabled={saveMut.isPending}>
              <Save className="size-3" /> {saveMut.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
        <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
          <AlertTriangle className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 dark:text-amber-300">
            Changes here affect <b>all {role.userCount} users</b> with the {ROLE_LABELS[roleKey]} role. Individual user overrides (in User Management) take precedence over these role defaults.
          </p>
        </div>
      </div>

      {/* Permission matrix */}
      <ScrollArea className="max-h-[60vh]">
        <div className="p-4 space-y-3">
          {ALL_MODULES.map(module => {
            const ov = overrides[module] || {}
            const roleActions = staticDefaults[module] || []
            const moduleEnabled = ov.enabled !== false && roleActions.length > 0
            const effectiveActions = ov.enabled === false ? [] : (ov.actions !== undefined && ov.actions !== null ? ov.actions : roleActions)
            const isCustom = ov && Object.values(ov).some(v => v !== undefined && v !== null)
            const relevantActions = MODULE_ACTIONS[module] || ['view']

            return (
              <div key={module} className={`rounded-lg border ${isCustom ? 'border-amber-500/40 bg-amber-500/5' : 'border-border'}`}>
                <div className="flex items-center gap-3 p-3">
                  <Switch checked={moduleEnabled} onCheckedChange={(v) => updateOverride(module, 'enabled', v)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{MODULE_LABELS[module]}</span>
                      {isCustom && <Badge className="text-[9px] h-4 bg-amber-500/15 text-amber-700">Custom</Badge>}
                      {!moduleEnabled && <Badge variant="destructive" className="text-[9px] h-4">Disabled</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{MODULE_DESCRIPTIONS[module]}</p>
                  </div>
                  {moduleEnabled && (roleKey === 'teacher' || roleKey === 'student' || roleKey === 'parent' || roleKey === 'transport_manager') && (
                    <Select
                      value={ov.dataScope || (roleKey === 'student' ? 'own' : roleKey === 'parent' ? 'children' : roleKey === 'teacher' ? 'assigned_classes' : 'all')}
                      onValueChange={(v) => updateOverride(module, 'dataScope', v)}
                    >
                      <SelectTrigger className="w-36 h-7 text-[11px]"><Lock className="size-2.5 mr-1" /><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(SCOPE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {moduleEnabled && (
                  <div className="px-3 pb-3 flex flex-wrap gap-1.5">
                    {relevantActions.map(action => {
                      const checked = effectiveActions.includes(action)
                      const roleHas = roleActions.includes(action)
                      const isOverridden = ov.actions !== undefined && ov.actions !== null
                      return (
                        <button
                          key={action}
                          onClick={() => {
                            const cur = ov.actions !== undefined && ov.actions !== null ? [...ov.actions] : [...roleActions]
                            const idx = cur.indexOf(action)
                            if (idx >= 0) cur.splice(idx, 1)
                            else cur.push(action)
                            if (cur.length > 0 && !cur.includes('view')) cur.push('view')
                            updateOverride(module, 'actions', cur)
                          }}
                          className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-colors cursor-pointer hover:border-primary/40 ${
                            checked
                              ? isOverridden ? 'bg-amber-500/15 text-amber-700 border-amber-500/40' : 'bg-primary/10 text-primary border-primary/20'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                          title={roleHas ? 'In role default' : 'Custom'}
                        >
                          {ACTION_LABELS[action]}
                        </button>
                      )
                    })}
                    {ov.actions !== undefined && ov.actions !== null && (
                      <button onClick={() => updateOverride(module, 'actions', null)} className="px-2 py-1 rounded-md text-[10px] text-muted-foreground hover:text-foreground">
                        ↺ Reset to default
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2">
            <Info className="size-4 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-0.5">Role-level vs User-level</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li><b>Role changes</b> apply to ALL users with this role immediately.</li>
                <li><b>User overrides</b> (in User Management tab) take precedence over role defaults.</li>
                <li><b>Data scope</b> controls which records the role sees (own/children/assigned classes/all).</li>
                <li><b>Super Admin</b> role is always locked — full access, cannot be restricted.</li>
              </ul>
            </div>
          </div>
        </div>
      </ScrollArea>
    </Card>
  )
}

function SummaryCard({ label, value, icon: Icon, accent = 'text-primary' }: { label: string; value: number; icon: any; accent?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Icon className={`size-5 ${accent}`} />
        <div>
          <div className="text-xl font-bold tabular-nums">{value}</div>
          <div className="text-[11px] text-muted-foreground">{label}</div>
        </div>
      </div>
    </Card>
  )
}

// ============ Permission Editor ============

function PermissionEditor({ userId, onClose }: { userId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['user-perms', userId],
    queryFn: () => api.admin.getUserPermissions(userId),
  })
  const [overrides, setOverrides] = useState<Record<string, any>>({})
  const [loaded, setLoaded] = useState(false)
  const [roleDialog, setRoleDialog] = useState(false)
  const [newRole, setNewRole] = useState<string>('')

  const user = data?.user
  const roleDefaults = data?.roleDefaults || {}

  // Initialize overrides when data loads
  if (data && !loaded) {
    setOverrides(data.overrides || {})
    setNewRole(user?.role || '')
    setLoaded(true)
  }

  const saveMut = useMutation({
    mutationFn: (ov: any) => api.admin.saveUserPermissions(userId, ov),
    onSuccess: () => {
      toast.success('Permissions saved', { description: 'Changes take effect on the user\'s next request.' })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['user-perms', userId] })
    },
    onError: (e: any) => toast.error('Failed to save: ' + e.message),
  })

  const resetMut = useMutation({
    mutationFn: () => api.admin.resetUserPermissions(userId),
    onSuccess: () => {
      toast.success('Reset to role defaults')
      setOverrides({})
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['user-perms', userId] })
    },
  })

  const roleMut = useMutation({
    mutationFn: (role: string) => api.admin.setUserRole(userId, role),
    onSuccess: (_d, role) => {
      toast.success(`Role changed to ${ROLE_LABELS[role as Role]}`)
      setRoleDialog(false)
      setOverrides({})  // reset overrides since role changed
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['user-perms', userId] })
    },
    onError: (e: any) => toast.error('Failed: ' + e.message),
  })

  const toggleActiveMut = useMutation({
    mutationFn: (active: boolean) => api.admin.toggleUserActive(userId, active),
    onSuccess: () => {
      toast.success('User status updated')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  if (isLoading || !user) {
    return <Card className="h-full"><CardContent className="p-8"><Skeleton className="h-96 w-full" /></CardContent></Card>
  }

  const isSuperAdmin = user.role === 'super_admin'

  const updateOverride = (module: string, field: string, value: any) => {
    setOverrides(prev => {
      const cur = { ...prev[module] } || {}
      cur[field] = value
      return { ...prev, [module]: cur }
    })
  }

  const getEffective = (module: ModuleId): Action[] => {
    const ov = overrides[module]
    if (ov?.enabled === false) return []
    if (ov?.actions !== undefined && ov?.actions !== null) return ov.actions
    return roleDefaults[module] || []
  }

  const hasOverride = (module: string) => overrides[module] && Object.values(overrides[module]).some(v => v !== undefined && v !== null)

  return (
    <Card className="h-full flex flex-col">
      {/* User header */}
      <div className="p-4 border-b bg-gradient-to-r from-violet-500/5 to-transparent">
        <div className="flex items-start gap-3">
          <Avatar className="size-12">
            <AvatarFallback className={`text-sm ${ROLE_COLORS[user.role]}`}>{user.name.split(' ').map((n:string)=>n[0]).slice(0,2).join('')}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base">{user.name}</h3>
              <Badge className={ROLE_COLORS[user.role]}>{ROLE_LABELS[user.role as Role]}</Badge>
              {!user.active && <Badge variant="destructive">Inactive</Badge>}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Mail className="size-3" />{user.email}</p>
          </div>
          {!isSuperAdmin && (
            <div className="flex gap-1.5 shrink-0">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setRoleDialog(true)}>Change Role</Button>
              <Button
                size="sm"
                variant={user.active ? 'outline' : 'default'}
                className="h-7 text-xs"
                onClick={() => toggleActiveMut.mutate(!user.active)}
                disabled={toggleActiveMut.isPending}
              >
                <Power className="size-3" /> {user.active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          )}
        </div>
        {isSuperAdmin && (
          <div className="mt-3 p-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-start gap-2">
            <AlertTriangle className="size-4 text-violet-600 shrink-0 mt-0.5" />
            <p className="text-xs text-violet-700 dark:text-violet-300">
              Super Admin has unrestricted access and cannot be modified. Permissions are fixed for this role.
            </p>
          </div>
        )}
      </div>

      {/* Permission matrix */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold">Module Permission Matrix</h4>
              <p className="text-[11px] text-muted-foreground">Toggle modules, customize CRUD actions, and set data scope per module.</p>
            </div>
            {!isSuperAdmin && (
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => resetMut.mutate()} disabled={resetMut.isPending}>
                  <RotateCcw className="size-3" /> Reset
                </Button>
                <Button size="sm" className="h-7 text-xs gap-1" onClick={() => saveMut.mutate(overrides)} disabled={saveMut.isPending}>
                  <Save className="size-3" /> {saveMut.isPending ? 'Saving…' : 'Save'}
                </Button>
              </div>
            )}
          </div>

          {ALL_MODULES.filter(m => m !== 'user-management' || user.role === 'super_admin').map(module => {
            const ov = overrides[module] || {}
            const roleActions = roleDefaults[module] || []
            const effectiveActions = getEffective(module)
            const moduleEnabled = ov.enabled !== false && roleActions.length > 0
            const isCustom = hasOverride(module)
            const relevantActions = MODULE_ACTIONS[module] || ['view']

            return (
              <div key={module} className={`rounded-lg border ${isCustom ? 'border-amber-500/40 bg-amber-500/5' : 'border-border'}`}>
                <div className="flex items-center gap-3 p-3">
                  {/* Module enable/disable switch */}
                  {!isSuperAdmin && (
                    <Switch
                      checked={moduleEnabled}
                      onCheckedChange={(v) => updateOverride(module, 'enabled', v)}
                      disabled={isSuperAdmin}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{MODULE_LABELS[module]}</span>
                      {isCustom && <Badge className="text-[9px] h-4 bg-amber-500/15 text-amber-700">Custom</Badge>}
                      {!moduleEnabled && <Badge variant="destructive" className="text-[9px] h-4">Disabled</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{MODULE_DESCRIPTIONS[module]}</p>
                  </div>
                  {/* Data scope selector */}
                  {!isSuperAdmin && moduleEnabled && (user.role === 'teacher' || user.role === 'student' || user.role === 'parent' || user.role === 'transport_manager') && (
                    <Select
                      value={ov.dataScope || (user.role === 'student' ? 'own' : user.role === 'parent' ? 'children' : user.role === 'teacher' ? 'assigned_classes' : 'all')}
                      onValueChange={(v) => updateOverride(module, 'dataScope', v)}
                    >
                      <SelectTrigger className="w-36 h-7 text-[11px]"><Lock className="size-2.5 mr-1" /><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(SCOPE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Action toggles */}
                {moduleEnabled && (
                  <div className="px-3 pb-3 flex flex-wrap gap-1.5">
                    {relevantActions.map(action => {
                      const checked = effectiveActions.includes(action)
                      const roleHas = roleActions.includes(action)
                      const isOverridden = ov.actions !== undefined && ov.actions !== null
                      return (
                        <button
                          key={action}
                          onClick={() => {
                            if (isSuperAdmin) return
                            const cur = ov.actions !== undefined && ov.actions !== null ? [...ov.actions] : [...roleActions]
                            const idx = cur.indexOf(action)
                            if (idx >= 0) cur.splice(idx, 1)
                            else cur.push(action)
                            // Always include 'view' if any action is present
                            if (cur.length > 0 && !cur.includes('view')) cur.push('view')
                            updateOverride(module, 'actions', cur)
                          }}
                          disabled={isSuperAdmin}
                          className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                            checked
                              ? isOverridden
                                ? 'bg-amber-500/15 text-amber-700 border-amber-500/40'
                                : 'bg-primary/10 text-primary border-primary/20'
                              : 'bg-muted text-muted-foreground border-border'
                          } ${isSuperAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-primary/40'}`}
                          title={roleHas ? 'In role default' : 'Custom'}
                        >
                          {ACTION_LABELS[action]}
                        </button>
                      )
                    })}
                    {ov.actions !== undefined && ov.actions !== null && (
                      <button
                        onClick={() => updateOverride(module, 'actions', null)}
                        className="px-2 py-1 rounded-md text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        ↺ Reset to role
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {!isSuperAdmin && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2">
              <Info className="size-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-0.5">How overrides work</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li><b>Switch off</b> a module to completely block access (overrides role default).</li>
                  <li><b>Click action chips</b> to toggle individual CRUD permissions.</li>
                  <li><b>Data scope</b> controls which records the user sees (own/children/assigned classes/all).</li>
                  <li><b>Save</b> to persist. Changes apply on the user's next API request.</li>
                  <li><b>Reset</b> clears all overrides back to role defaults.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Change role dialog */}
      <AlertDialog open={roleDialog} onOpenChange={setRoleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change role for {user.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will change the user's base role. Any custom permission overrides will be cleared. The user will get the default permissions for the new role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label>New Role</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    <div className="flex flex-col">
                      <span>{v}</span>
                      <span className="text-[10px] text-muted-foreground">{ROLE_DESCRIPTIONS[k as Role]}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => newRole && roleMut.mutate(newRole)} disabled={roleMut.isPending || newRole === user.role}>
              {roleMut.isPending ? 'Changing…' : 'Change Role'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
