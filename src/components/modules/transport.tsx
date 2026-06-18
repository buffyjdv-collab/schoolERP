'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useCan } from '@/lib/store'
import { StatCard, SectionHeader, StatusBadge, EmptyState } from '@/components/erp/primitives'
import type { Vehicle } from '@/lib/types'
import {
  Bus, Users, Gauge, MapPin, Navigation, Radio, Activity, Phone,
  Plus, Pencil, Trash2, Search, X, Settings2, Route as RouteIcon,
  UserCheck, UserX, UserPlus, CalendarOff, ClipboardList, MapPinned,
  IdCard, ChevronDown, ChevronRight, Layers,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
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
import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'

// ============ Constants & helpers ============

// Bangalore city bounds for our map projection
const BOUNDS = { minLat: 12.88, maxLat: 13.25, minLng: 77.50, maxLng: 77.75 }

function project(lat: number, lng: number, w: number, h: number) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * w
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * h
  return { x, y }
}

// Vehicle colors by index — emerald/teal/amber/rose/violet/cyan only (no indigo/blue)
const VEH_COLORS = ['#10b981', '#14b8a6', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4']

const VEHICLE_TYPES = ['Bus', 'Mini Bus', 'Van', 'Car'] as const

interface LiveVehicle {
  id: string; vehicleNo: string; routeName: string; driverName: string
  lat: number; lng: number; speed: number; heading: number; status: string
  lastUpdate: string
}

interface Stop {
  id: string; name: string; routeName: string; lat: number; lng: number
  pickupTime: string; dropTime: string; fare: number
}

interface Driver {
  id: string
  name: string
  phone: string
  licenseNo?: string | null
  address?: string | null
  joiningDate: string
  status: string // Active | OnLeave | Inactive
  vehicleId?: string | null
  vehicleNo?: string | null
  routeName?: string | null
}

interface RouteVehicle { id: string; vehicleNo: string; type: string; capacity: number; status: string; driverName: string; driverPhone: string }

interface RouteInfo {
  id: string
  name: string
  description?: string | null
  status: string // Active | Inactive
  stopCount: number
  vehicles: RouteVehicle[]
}

// ============ Main module ============

export function TransportModule() {
  // Live GPS state — hoisted so the socket stays connected across tab switches.
  const [liveVehicles, setLiveVehicles] = useState<LiveVehicle[]>([])
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  // Fleet list — used by Live Tracking (map + list) and shared with Drivers/Routes tabs (assign dropdowns).
  // Polling fallback kicks in only when the socket isn't connected.
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: api.transport.vehicles,
    refetchInterval: connected ? false : 3000,
  })

  // Stops list — used by Live Tracking (route stops table) and shared with Routes tab (manage stops).
  const { data: stops } = useQuery({ queryKey: ['stops'], queryFn: api.transport.stops })

  // Connect to live GPS tracker mini-service via socket.io (port 3003, XTransformPort).
  useEffect(() => {
    const socket = io('/?XTransformPort=3003', { transports: ['websocket', 'polling'], forceNew: true, reconnection: true })
    socketRef.current = socket
    socket.on('connect', () => { setConnected(true); toast.success('Live GPS tracking connected') })
    socket.on('disconnect', () => setConnected(false))
    socket.on('vehicles:update', (data: LiveVehicle[]) => {
      setLiveVehicles(data)
    })
    return () => { socket.disconnect() }
  }, [])

  return (
    <div className="space-y-5">
      <Tabs defaultValue="live" className="w-full">
        <div className="overflow-x-auto -mx-1 px-1 pb-1">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="live" className="gap-1.5"><Navigation className="size-3.5" /> Live Tracking</TabsTrigger>
            <TabsTrigger value="drivers" className="gap-1.5"><IdCard className="size-3.5" /> Drivers</TabsTrigger>
            <TabsTrigger value="routes" className="gap-1.5"><RouteIcon className="size-3.5" /> Routes</TabsTrigger>
            <TabsTrigger value="assign" className="gap-1.5"><ClipboardList className="size-3.5" /> Student Assignment</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="live" className="outline-none">
          <LiveTrackingTab
            vehicles={vehicles || []}
            vehiclesLoading={vehiclesLoading}
            liveVehicles={liveVehicles}
            connected={connected}
            stops={stops || []}
          />
        </TabsContent>

        <TabsContent value="drivers" className="outline-none">
          <DriversTab vehicles={vehicles || []} vehiclesLoading={vehiclesLoading} />
        </TabsContent>

        <TabsContent value="routes" className="outline-none">
          <RoutesTab vehicles={vehicles || []} vehiclesLoading={vehiclesLoading} stops={stops || []} />
        </TabsContent>

        <TabsContent value="assign" className="outline-none">
          <StudentAssignmentTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============ Tab 1: Live Tracking (existing, refactored to receive props) ============

function LiveTrackingTab({
  vehicles, vehiclesLoading, liveVehicles, connected, stops,
}: {
  vehicles: Vehicle[]
  vehiclesLoading: boolean
  liveVehicles: LiveVehicle[]
  connected: boolean
  stops: Stop[]
}) {
  const qc = useQueryClient()
  const canCreate = useCan()('transport', 'create')
  const canEdit = useCan()('transport', 'edit')
  const canDelete = useCan()('transport', 'delete')

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [vehicleDialog, setVehicleDialog] = useState<{ mode: 'create' | 'edit'; target?: Vehicle } | null>(null)
  const [vehicleDelete, setVehicleDelete] = useState<Vehicle | null>(null)
  const [stopDialog, setStopDialog] = useState(false)
  const [stopDelete, setStopDelete] = useState<Stop | null>(null)

  const createVehicleMut = useMutation({
    mutationFn: (data: any) => api.transport.createVehicle(data),
    onSuccess: () => {
      toast.success('Vehicle added', { description: 'The new vehicle has been added to the fleet.' })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      setVehicleDialog(null)
    },
    onError: () => toast.error('Failed to add vehicle'),
  })

  const updateVehicleMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.transport.updateVehicle(id, data),
    onSuccess: () => {
      toast.success('Vehicle updated', { description: 'The vehicle record has been saved.' })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      setVehicleDialog(null)
    },
    onError: () => toast.error('Failed to update vehicle'),
  })

  const deleteVehicleMut = useMutation({
    mutationFn: (id: string) => api.transport.deleteVehicle(id),
    onSuccess: () => {
      toast.success('Vehicle deleted', { description: 'The vehicle has been removed from the fleet.' })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      setVehicleDelete(null)
      if (selectedId) setSelectedId(null)
    },
    onError: () => toast.error('Failed to delete vehicle'),
  })

  const createStopMut = useMutation({
    mutationFn: (data: any) => api.transport.createStop(data),
    onSuccess: () => {
      toast.success('Stop added', { description: 'The new route stop has been created.' })
      qc.invalidateQueries({ queryKey: ['stops'] })
      setStopDialog(false)
    },
    onError: () => toast.error('Failed to add stop'),
  })

  const deleteStopMut = useMutation({
    mutationFn: (id: string) => api.transport.deleteStop(id),
    onSuccess: () => {
      toast.success('Stop deleted', { description: 'The route stop has been removed.' })
      qc.invalidateQueries({ queryKey: ['stops'] })
      setStopDelete(null)
    },
    onError: () => toast.error('Failed to delete stop'),
  })

  const merged: LiveVehicle[] = liveVehicles.length ? liveVehicles : vehicles.map(v => ({
    id: v.id, vehicleNo: v.vehicleNo, routeName: v.routeName, driverName: v.driverName,
    lat: v.currentLat || 0, lng: v.currentLng || 0, speed: v.speed || 0, heading: v.heading || 0,
    status: v.status, lastUpdate: v.lastUpdate || new Date().toISOString(),
  }))

  const moving = merged.filter(v => v.status === 'Moving').length
  const stopped = merged.filter(v => v.status === 'Stopped').length
  const selected = merged.find(v => v.id === selectedId) || merged[0]
  // Original vehicle record (with all fields) for edit/delete operations
  const selectedVehicle: Vehicle | undefined = vehicles.find(v => v.id === selected?.id)

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Fleet" value={merged.length} sub="Buses & Vans" icon={Bus} accent="primary" loading={vehiclesLoading} />
        <StatCard label="Moving Now" value={moving} sub="Live on route" icon={Navigation} accent="emerald" loading={vehiclesLoading} />
        <StatCard label="At Stops" value={stopped} sub="Loading/unloading" icon={MapPin} accent="amber" loading={vehiclesLoading} />
        <StatCard label="GPS Status" value={connected ? 'Online' : 'Connecting'} sub={connected ? 'Real-time sync' : 'Establishing link'} icon={Radio} accent={connected ? 'emerald' : 'rose'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live Map */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Navigation className="size-4 text-primary" /> Live Fleet Map
              {connected && <span className="ml-auto flex items-center gap-1.5 text-[11px] text-emerald-600"><span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> LIVE</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <LiveMap vehicles={merged} stops={stops} selectedId={selected?.id} onSelect={setSelectedId} />
          </CardContent>
        </Card>

        {/* Vehicle list */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><Bus className="size-4 text-primary" /> Fleet Status</CardTitle>
              {canCreate && (
                <Button size="sm" className="gap-1.5 h-8" onClick={() => setVehicleDialog({ mode: 'create' })}>
                  <Plus className="size-3.5" /> <span className="hidden sm:inline">Add Vehicle</span><span className="sm:hidden">Add</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[420px]">
              <div className="p-3 space-y-2">
                {vehiclesLoading ? Array.from({length:6}).map((_,i) => <Skeleton key={i} className="h-16 w-full" />) :
                  merged.map((v, i) => (
                    <button key={v.id} onClick={() => setSelectedId(v.id)} className={`w-full text-left p-3 rounded-lg border transition-all ${selected?.id === v.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                      <div className="flex items-center gap-2.5">
                        <div className="size-9 rounded-lg grid place-items-center shrink-0 text-white" style={{ background: VEH_COLORS[i % VEH_COLORS.length] }}>
                          <Bus className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium truncate">{v.vehicleNo}</span>
                            <StatusBadge status={v.status} />
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">{v.routeName}</div>
                          <div className="flex items-center gap-3 mt-0.5 text-[11px]">
                            <span className="flex items-center gap-0.5"><Gauge className="size-3" /> {v.speed} km/h</span>
                            <span className="flex items-center gap-0.5"><Users className="size-3" /> {Math.floor(Math.random()*30)+15}/{45}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                }
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Selected vehicle detail */}
      {selected && (
        <Card>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="md:col-span-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-12 rounded-xl grid place-items-center text-white" style={{ background: VEH_COLORS[merged.findIndex(v => v.id === selected.id) % VEH_COLORS.length] }}>
                    <Bus className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-bold">{selected.vehicleNo}</h3>
                    <p className="text-xs text-muted-foreground">{selected.routeName}</p>
                  </div>
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <div className="md:col-span-2 grid grid-cols-2 gap-3">
                <Metric icon={Gauge} label="Current Speed" value={`${selected.speed} km/h`} />
                <Metric icon={Navigation} label="Heading" value={`${selected.heading}°`} />
                <Metric icon={MapPin} label="Latitude" value={selected.lat.toFixed(5)} />
                <Metric icon={MapPin} label="Longitude" value={selected.lng.toFixed(5)} />
                <Metric icon={Phone} label="Driver" value={selected.driverName} />
                <Metric icon={Activity} label="Last Update" value={new Date(selected.lastUpdate).toLocaleTimeString('en-IN')} />
              </div>
              <div className="md:col-span-1 space-y-2">
                {(canEdit || canDelete) && selectedVehicle && (
                  <>
                    <div className="flex gap-2">
                      {canEdit && (
                        <Button className="flex-1 gap-1.5" variant="outline" size="sm" onClick={() => setVehicleDialog({ mode: 'edit', target: selectedVehicle })}>
                          <Pencil className="size-3.5" /> Edit
                        </Button>
                      )}
                      {canDelete && (
                        <Button className="flex-1 gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10" variant="outline" size="sm" onClick={() => setVehicleDelete(selectedVehicle)}>
                          <Trash2 className="size-3.5" /> Delete
                        </Button>
                      )}
                    </div>
                    <Separator className="my-1" />
                  </>
                )}
                <Button className="w-full" variant="outline" onClick={() => toast.info('Sending pickup notification to parents…')}><MapPin className="size-4 mr-1.5" /> Notify Pickup</Button>
                <Button className="w-full" variant="outline" onClick={() => toast.info('Sending drop notification to parents…')}><Navigation className="size-4 mr-1.5" /> Notify Drop</Button>
                <Button className="w-full" variant="outline" onClick={() => toast.info('ETA calculation requested…')}><Activity className="size-4 mr-1.5" /> Calculate ETA</Button>
                <Separator className="my-2" />
                <div className="text-[11px] text-muted-foreground">Geofence: School campus (500m). Alerts on entry/exit.</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Route stops table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium">Route Stops & Pickups</CardTitle>
            {canCreate && (
              <Button size="sm" className="gap-1.5 h-8" onClick={() => setStopDialog(true)}>
                <Plus className="size-3.5" /> <span className="hidden sm:inline">Add Stop</span><span className="sm:hidden">Add</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-64">
            <div className="p-4 space-y-2">
              {stops.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-8">No route stops configured.</div>
              ) : stops.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                  <div className="size-2 rounded-full bg-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{s.routeName}</div>
                  </div>
                  <div className="text-xs text-muted-foreground hidden sm:block">Pickup: {s.pickupTime}</div>
                  <div className="text-xs text-muted-foreground hidden sm:block">Drop: {s.dropTime}</div>
                  <Badge variant="outline" className="text-[10px]">₹{s.fare}</Badge>
                  {canDelete && (
                    <Button size="icon" variant="ghost" className="size-7 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 shrink-0" title="Delete stop" onClick={() => setStopDelete(s)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {vehicleDialog && (
        <VehicleFormDialog
          key={vehicleDialog.mode === 'edit' ? vehicleDialog.target?.id : 'create'}
          mode={vehicleDialog.mode}
          target={vehicleDialog.target}
          loading={createVehicleMut.isPending || updateVehicleMut.isPending}
          onClose={() => setVehicleDialog(null)}
          onSubmit={(data) => {
            if (vehicleDialog.mode === 'edit' && vehicleDialog.target) {
              updateVehicleMut.mutate({ id: vehicleDialog.target.id, data })
            } else {
              createVehicleMut.mutate(data)
            }
          }}
        />
      )}

      {vehicleDelete && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setVehicleDelete(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete vehicle?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <strong>{vehicleDelete.vehicleNo}</strong> ({vehicleDelete.type || 'Vehicle'}) — Driver: {vehicleDelete.driverName}, Route: {vehicleDelete.routeName}. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => deleteVehicleMut.mutate(vehicleDelete.id)}
                disabled={deleteVehicleMut.isPending}
              >
                {deleteVehicleMut.isPending ? 'Deleting…' : 'Yes, delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {stopDialog && (
        <StopFormDialog
          loading={createStopMut.isPending}
          onClose={() => setStopDialog(false)}
          onSubmit={(data) => createStopMut.mutate(data)}
        />
      )}

      {stopDelete && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setStopDelete(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete stop?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the <strong>{stopDelete.name}</strong> stop on route <strong>{stopDelete.routeName}</strong> (Pickup {stopDelete.pickupTime}, Drop {stopDelete.dropTime}, Fare ₹{stopDelete.fare}). This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => deleteStopMut.mutate(stopDelete.id)}
                disabled={deleteStopMut.isPending}
              >
                {deleteStopMut.isPending ? 'Deleting…' : 'Yes, delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

// ============ Tab 2: Drivers ============

function DriversTab({ vehicles, vehiclesLoading }: { vehicles: Vehicle[]; vehiclesLoading: boolean }) {
  const qc = useQueryClient()
  const canCreate = useCan()('transport', 'create')
  const canEdit = useCan()('transport', 'edit')
  const canDelete = useCan()('transport', 'delete')

  const { data: drivers, isLoading } = useQuery({ queryKey: ['drivers'], queryFn: api.transport.drivers })

  const [driverDialog, setDriverDialog] = useState<{ mode: 'create' | 'edit'; target?: Driver } | null>(null)
  const [driverDelete, setDriverDelete] = useState<Driver | null>(null)

  const createDriverMut = useMutation({
    mutationFn: (data: any) => api.transport.createDriver(data),
    onSuccess: () => {
      toast.success('Driver added', { description: 'The new driver has been added to the roster.' })
      qc.invalidateQueries({ queryKey: ['drivers'] })
      setDriverDialog(null)
    },
    onError: () => toast.error('Failed to add driver'),
  })

  const updateDriverMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.transport.updateDriver(id, data),
    onSuccess: () => {
      toast.success('Driver updated', { description: 'The driver record has been saved.' })
      qc.invalidateQueries({ queryKey: ['drivers'] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      setDriverDialog(null)
    },
    onError: () => toast.error('Failed to update driver'),
  })

  const deleteDriverMut = useMutation({
    mutationFn: (id: string) => api.transport.deleteDriver(id),
    onSuccess: () => {
      toast.success('Driver removed', { description: 'The driver has been deactivated and unassigned.' })
      qc.invalidateQueries({ queryKey: ['drivers'] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      setDriverDelete(null)
    },
    onError: () => toast.error('Failed to remove driver'),
  })

  const assignDriverMut = useMutation({
    mutationFn: ({ id, vehicleId }: { id: string; vehicleId: string | null }) => api.transport.assignDriver(id, vehicleId),
    onSuccess: (_d, vars) => {
      toast.success(vars.vehicleId ? 'Driver assigned to bus' : 'Driver unassigned', {
        description: vars.vehicleId ? 'The driver is now paired with the selected vehicle.' : 'The driver no longer has an assigned vehicle.',
      })
      qc.invalidateQueries({ queryKey: ['drivers'] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
    },
    onError: () => toast.error('Failed to update assignment'),
  })

  const total = drivers?.length ?? 0
  const assigned = drivers?.filter(d => d.vehicleId).length ?? 0
  const available = drivers?.filter(d => !d.vehicleId && d.status === 'Active').length ?? 0
  const onLeave = drivers?.filter(d => d.status === 'OnLeave').length ?? 0

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Driver Roster"
        description="Manage driver profiles, license details, and bus assignments."
        action={canCreate && (
          <Button className="gap-1.5" onClick={() => setDriverDialog({ mode: 'create' })}>
            <UserPlus className="size-4" /> Add Driver
          </Button>
        )}
      />

      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Drivers" value={total} sub="On the roster" icon={IdCard} accent="primary" loading={isLoading} />
        <StatCard label="Assigned" value={assigned} sub="Currently driving a bus" icon={UserCheck} accent="emerald" loading={isLoading} />
        <StatCard label="Available" value={available} sub="Free & active" icon={Bus} accent="amber" loading={isLoading} />
        <StatCard label="On Leave" value={onLeave} sub="Not available" icon={CalendarOff} accent="rose" loading={isLoading} />
      </div>

      {/* Drivers table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2"><IdCard className="size-4 text-primary" /> Drivers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[60vh] overflow-y-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="min-w-[160px]">Name</TableHead>
                  <TableHead className="min-w-[130px]">Phone</TableHead>
                  <TableHead className="min-w-[140px]">License No</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="min-w-[180px]">Assigned Bus</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableBodySkeletonCell colSpan={6} />
                  </TableRow>
                )) : !drivers || drivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-12">
                      No drivers yet. Click <strong>Add Driver</strong> to create the first one.
                    </TableCell>
                  </TableRow>
                ) : drivers.map(d => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="font-medium">{d.name}</div>
                      {d.address && <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">{d.address}</div>}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">{d.phone || '—'}</TableCell>
                    <TableCell className="text-sm">{d.licenseNo || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell><StatusBadge status={d.status} /></TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Select
                          value={d.vehicleId || '__none__'}
                          onValueChange={(val) => assignDriverMut.mutate({ id: d.id, vehicleId: val === '__none__' ? null : val })}
                          disabled={assignDriverMut.isPending}
                        >
                          <SelectTrigger className="h-8 w-full min-w-[170px] text-xs">
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— Unassign —</SelectItem>
                            {vehicles.map(v => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.vehicleNo} · {v.routeName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : d.vehicleNo ? (
                        <Badge variant="outline" className="gap-1"><Bus className="size-3" /> {d.vehicleNo}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <Button size="icon" variant="ghost" className="size-8" title="Edit driver" onClick={() => setDriverDialog({ mode: 'edit', target: d })}>
                            <Pencil className="size-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button size="icon" variant="ghost" className="size-8 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10" title="Remove driver" onClick={() => setDriverDelete(d)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                        {!canEdit && !canDelete && <span className="text-xs text-muted-foreground">View only</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {vehiclesLoading && drivers && drivers.some(d => d.vehicleId) && (
            <div className="px-4 py-2 text-[11px] text-muted-foreground border-t">Refreshing vehicle assignments…</div>
          )}
        </CardContent>
      </Card>

      {driverDialog && (
        <DriverFormDialog
          key={driverDialog.mode === 'edit' ? driverDialog.target?.id : 'create'}
          mode={driverDialog.mode}
          target={driverDialog.target}
          loading={createDriverMut.isPending || updateDriverMut.isPending}
          onClose={() => setDriverDialog(null)}
          onSubmit={(data) => {
            if (driverDialog.mode === 'edit' && driverDialog.target) {
              updateDriverMut.mutate({ id: driverDialog.target.id, data })
            } else {
              createDriverMut.mutate(data)
            }
          }}
        />
      )}

      {driverDelete && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setDriverDelete(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove driver?</AlertDialogTitle>
              <AlertDialogDescription>
                This will deactivate <strong>{driverDelete.name}</strong> ({driverDelete.phone}) and unassign them from any bus. The driver record will remain in history with status <em>Inactive</em>. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => deleteDriverMut.mutate(driverDelete.id)}
                disabled={deleteDriverMut.isPending}
              >
                {deleteDriverMut.isPending ? 'Removing…' : 'Yes, remove'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

// ============ Tab 3: Routes ============

function RoutesTab({ vehicles, vehiclesLoading, stops }: { vehicles: Vehicle[]; vehiclesLoading: boolean; stops: Stop[] }) {
  const qc = useQueryClient()
  const canCreate = useCan()('transport', 'create')
  const canEdit = useCan()('transport', 'edit')
  const canDelete = useCan()('transport', 'delete')

  const { data: routes, isLoading } = useQuery({ queryKey: ['routes'], queryFn: api.transport.routes })

  const [routeDialog, setRouteDialog] = useState<{ mode: 'create' | 'edit'; target?: RouteInfo } | null>(null)
  const [routeDelete, setRouteDelete] = useState<RouteInfo | null>(null)
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null)
  const [stopDialogForRoute, setStopDialogForRoute] = useState<RouteInfo | null>(null)
  const [stopDelete, setStopDelete] = useState<Stop | null>(null)
  const [stopEdit, setStopEdit] = useState<{ stop: Stop; route: RouteInfo } | null>(null)

  const createRouteMut = useMutation({
    mutationFn: (data: any) => api.transport.createRoute(data),
    onSuccess: () => {
      toast.success('Route created', { description: 'The new route has been added.' })
      qc.invalidateQueries({ queryKey: ['routes'] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      setRouteDialog(null)
    },
    onError: () => toast.error('Failed to create route'),
  })

  const updateRouteMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.transport.updateRoute(id, data),
    onSuccess: () => {
      toast.success('Route updated', { description: 'The route has been saved.' })
      qc.invalidateQueries({ queryKey: ['routes'] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      qc.invalidateQueries({ queryKey: ['stops'] })
      setRouteDialog(null)
    },
    onError: () => toast.error('Failed to update route'),
  })

  const deleteRouteMut = useMutation({
    mutationFn: (id: string) => api.transport.deleteRoute(id),
    onSuccess: () => {
      toast.success('Route deleted', { description: 'The route and its bus/stop links have been removed.' })
      qc.invalidateQueries({ queryKey: ['routes'] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      qc.invalidateQueries({ queryKey: ['stops'] })
      qc.invalidateQueries({ queryKey: ['students'] })
      setRouteDelete(null)
    },
    onError: () => toast.error('Failed to delete route'),
  })

  const assignBusMut = useMutation({
    mutationFn: ({ routeId, vehicleId }: { routeId: string; vehicleId: string | null }) => api.transport.assignBusToRoute(routeId, vehicleId),
    onSuccess: (_d, vars) => {
      toast.success(vars.vehicleId ? 'Bus assigned to route' : 'All buses unassigned', {
        description: vars.vehicleId ? 'The vehicle is now serving this route.' : 'All vehicles have been removed from this route.',
      })
      qc.invalidateQueries({ queryKey: ['routes'] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
    },
    onError: () => toast.error('Failed to update bus assignment'),
  })

  const createStopMut = useMutation({
    mutationFn: (data: any) => api.transport.createStop(data),
    onSuccess: () => {
      toast.success('Stop added', { description: 'The stop has been added to this route.' })
      qc.invalidateQueries({ queryKey: ['stops'] })
      setStopDialogForRoute(null)
    },
    onError: () => toast.error('Failed to add stop'),
  })

  const updateStopMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.transport.updateStop(id, data),
    onSuccess: () => {
      toast.success('Stop updated', { description: 'The stop details have been saved.' })
      qc.invalidateQueries({ queryKey: ['stops'] })
      setStopEdit(null)
    },
    onError: () => toast.error('Failed to update stop'),
  })

  const deleteStopMut = useMutation({
    mutationFn: (id: string) => api.transport.deleteStop(id),
    onSuccess: () => {
      toast.success('Stop deleted', { description: 'The stop has been removed.' })
      qc.invalidateQueries({ queryKey: ['stops'] })
      setStopDelete(null)
    },
    onError: () => toast.error('Failed to delete stop'),
  })

  const total = routes?.length ?? 0
  const active = routes?.filter(r => r.status === 'Active').length ?? 0
  const totalBuses = routes?.reduce((s, r) => s + (r.vehicles?.length || 0), 0) ?? 0
  const totalStops = routes?.reduce((s, r) => s + (r.stopCount || 0), 0) ?? 0

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Transport Routes"
        description="Plan bus routes, assign vehicles, and manage pickup/drop stops."
        action={canCreate && (
          <Button className="gap-1.5" onClick={() => setRouteDialog({ mode: 'create' })}>
            <Plus className="size-4" /> Add Route
          </Button>
        )}
      />

      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Routes" value={total} sub="Configured" icon={RouteIcon} accent="primary" loading={isLoading} />
        <StatCard label="Active" value={active} sub="In service" icon={Activity} accent="emerald" loading={isLoading} />
        <StatCard label="Buses Assigned" value={totalBuses} sub="Across all routes" icon={Bus} accent="amber" loading={isLoading} />
        <StatCard label="Total Stops" value={totalStops} sub="Pickup / drop points" icon={MapPinned} accent="violet" loading={isLoading} />
      </div>

      {/* Routes list (cards) */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : !routes || routes.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState icon={RouteIcon} title="No routes configured" description="Create your first transport route to assign buses and define stops." />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {routes.map(r => {
            const isExpanded = expandedRoute === r.id
            const routeStops = stops.filter(s => s.routeName === r.name)
            return (
              <Card key={r.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <RouteIcon className="size-4 text-primary shrink-0" />
                        <span className="truncate">{r.name}</span>
                        <StatusBadge status={r.status} />
                      </CardTitle>
                      {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  {/* Meta strip */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <div className="text-muted-foreground">Stops</div>
                      <div className="font-semibold text-sm tabular-nums">{r.stopCount}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <div className="text-muted-foreground">Buses</div>
                      <div className="font-semibold text-sm tabular-nums">{r.vehicles?.length ?? 0}</div>
                    </div>
                  </div>

                  {/* Assigned buses */}
                  <div>
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1.5">Assigned Buses</div>
                    {r.vehicles && r.vehicles.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {r.vehicles.map(v => (
                          <Badge key={v.id} variant="outline" className="gap-1 py-1 px-2">
                            <Bus className="size-3 text-primary" />
                            <span className="font-medium">{v.vehicleNo}</span>
                            {v.driverName && <span className="text-muted-foreground">· {v.driverName}</span>}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic">No buses assigned yet.</div>
                    )}
                  </div>

                  {/* Assign bus action */}
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <Select
                        value=""
                        onValueChange={(val) => {
                          if (val === '__clear__') assignBusMut.mutate({ routeId: r.id, vehicleId: null })
                          else assignBusMut.mutate({ routeId: r.id, vehicleId: val })
                        }}
                        disabled={assignBusMut.isPending || vehiclesLoading}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue placeholder="Assign a bus to this route…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__clear__" className="text-rose-600">— Unassign all buses —</SelectItem>
                          {vehicles.map(v => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.vehicleNo} · {v.routeName || 'No current route'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t">
                    {canEdit && (
                      <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => setRouteDialog({ mode: 'edit', target: r })}>
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={isExpanded ? 'default' : 'outline'}
                      className="gap-1.5 h-8"
                      onClick={() => setExpandedRoute(isExpanded ? null : r.id)}
                    >
                      <Settings2 className="size-3.5" /> Manage Stops
                      {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                    </Button>
                    {canDelete && (
                      <Button size="sm" variant="outline" className="gap-1.5 h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 ml-auto" onClick={() => setRouteDelete(r)}>
                        <Trash2 className="size-3.5" /> Delete
                      </Button>
                    )}
                  </div>

                  {/* Manage Stops sub-view */}
                  {isExpanded && (
                    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-medium flex items-center gap-1.5"><MapPinned className="size-3.5 text-primary" /> Stops on this route ({routeStops.length})</div>
                        {canCreate && (
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setStopDialogForRoute(r)}>
                            <Plus className="size-3" /> Add Stop
                          </Button>
                        )}
                      </div>
                      {routeStops.length === 0 ? (
                        <div className="text-xs text-muted-foreground py-4 text-center">No stops defined for this route yet.</div>
                      ) : (
                        <div className="max-h-64 overflow-y-auto scroll-thin space-y-1.5 pr-1">
                          {routeStops.map(s => (
                            <div key={s.id} className="flex items-center gap-2 p-2 rounded-md bg-background border text-xs">
                              <div className="size-1.5 rounded-full bg-primary shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="font-medium truncate">{s.name}</div>
                                <div className="text-[10px] text-muted-foreground">Pickup {s.pickupTime} · Drop {s.dropTime} · ₹{s.fare}</div>
                              </div>
                              {canEdit && (
                                <Button size="icon" variant="ghost" className="size-7" title="Edit stop" onClick={() => setStopEdit({ stop: s, route: r })}>
                                  <Pencil className="size-3" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button size="icon" variant="ghost" className="size-7 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10" title="Delete stop" onClick={() => setStopDelete(s)}>
                                  <Trash2 className="size-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {routeDialog && (
        <RouteFormDialog
          key={routeDialog.mode === 'edit' ? routeDialog.target?.id : 'create'}
          mode={routeDialog.mode}
          target={routeDialog.target}
          vehicles={vehicles}
          loading={createRouteMut.isPending || updateRouteMut.isPending}
          onClose={() => setRouteDialog(null)}
          onSubmit={(data) => {
            if (routeDialog.mode === 'edit' && routeDialog.target) {
              updateRouteMut.mutate({ id: routeDialog.target.id, data })
            } else {
              createRouteMut.mutate(data)
            }
          }}
        />
      )}

      {routeDelete && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setRouteDelete(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete route?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <strong>{routeDelete.name}</strong>. All buses and stops will be unlinked from this route, and students assigned to it will lose their transport assignment. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => deleteRouteMut.mutate(routeDelete.id)}
                disabled={deleteRouteMut.isPending}
              >
                {deleteRouteMut.isPending ? 'Deleting…' : 'Yes, delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {stopDialogForRoute && (
        <StopFormDialog
          defaultRouteName={stopDialogForRoute.name}
          loading={createStopMut.isPending}
          onClose={() => setStopDialogForRoute(null)}
          onSubmit={(data) => createStopMut.mutate(data)}
        />
      )}

      {stopEdit && (
        <StopFormDialog
          mode="edit"
          defaultRouteName={stopEdit.route.name}
          target={stopEdit.stop}
          loading={updateStopMut.isPending}
          onClose={() => setStopEdit(null)}
          onSubmit={(data) => updateStopMut.mutate({ id: stopEdit.stop.id, data })}
        />
      )}

      {stopDelete && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setStopDelete(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete stop?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the <strong>{stopDelete.name}</strong> stop (Pickup {stopDelete.pickupTime}, Drop {stopDelete.dropTime}, Fare ₹{stopDelete.fare}). This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => deleteStopMut.mutate(stopDelete.id)}
                disabled={deleteStopMut.isPending}
              >
                {deleteStopMut.isPending ? 'Deleting…' : 'Yes, delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

// ============ Tab 4: Student Assignment ============

function StudentAssignmentTab() {
  const qc = useQueryClient()
  const canEditStudents = useCan()('students', 'edit')

  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [routePickerFor, setRoutePickerFor] = useState<{ studentId: string; currentRouteId: string | null } | null>(null)

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 350)
    return () => clearTimeout(t)
  }, [q])

  const { data: routes } = useQuery({ queryKey: ['routes'], queryFn: api.transport.routes })
  const { data: students, isLoading } = useQuery({
    queryKey: ['students', 'transport-search', debouncedQ],
    queryFn: () => api.students.list({ q: debouncedQ }),
    enabled: debouncedQ.length >= 2,
  })

  const assignStudentMut = useMutation({
    mutationFn: ({ studentId, routeId }: { studentId: string; routeId: string | null }) => api.transport.assignStudent(studentId, routeId),
    onSuccess: (_d, vars) => {
      toast.success(vars.routeId ? 'Transport assigned' : 'Transport unassigned', {
        description: vars.routeId ? 'The student has been linked to the selected route.' : 'The student no longer has transport assigned.',
      })
      qc.invalidateQueries({ queryKey: ['students', 'transport-search', debouncedQ] })
      setRoutePickerFor(null)
    },
    onError: () => toast.error('Failed to update transport assignment'),
  })

  const list = students || []
  const usingTransport = list.filter(s => s.transportRouteId).length
  const notAssigned = list.length - usingTransport

  const routeNameById = (id?: string | null) => {
    if (!id) return null
    const r = routes?.find(rr => rr.id === id)
    return r ? r.name : null
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Student Transport Assignment"
        description="Search for a student and assign (or unassign) a transport route. Students without a route will not appear on bus rosters."
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Search Results" value={list.length} sub={debouncedQ.length < 2 ? 'Type to search' : `Matching "${debouncedQ}"`} icon={Search} accent="primary" loading={isLoading} />
        <StatCard label="Using Transport" value={usingTransport} sub="Have an assigned route" icon={Bus} accent="emerald" loading={isLoading} />
        <StatCard label="Not Assigned" value={notAssigned} sub="No transport route" icon={UserX} accent="amber" loading={isLoading} />
      </div>

      {/* Search bar */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by student name or admission number…"
              className="pl-9 pr-9"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">Tip: enter at least 2 characters. The list is scoped to your role's permissions.</p>
        </CardContent>
      </Card>

      {/* Results table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2"><ClipboardList className="size-4 text-primary" /> Search Results</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[60vh] overflow-y-auto scroll-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="min-w-[180px]">Student</TableHead>
                  <TableHead className="min-w-[110px]">Admission No</TableHead>
                  <TableHead className="min-w-[120px]">Class</TableHead>
                  <TableHead className="min-w-[180px]">Current Route</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debouncedQ.length < 2 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-12">
                      Start typing above to find a student.
                    </TableCell>
                  </TableRow>
                ) : isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableBodySkeletonCell colSpan={5} />
                    </TableRow>
                  ))
                ) : list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-12">
                      No students found matching <strong>"{debouncedQ}"</strong>.
                    </TableCell>
                  </TableRow>
                ) : list.map(s => {
                  const currentRouteId = (s as any).routeId as string | null | undefined
                  const currentRouteName = s.transportRouteId || routeNameById(currentRouteId)
                  const pickerOpen = routePickerFor?.studentId === s.id
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium">{s.fullName}</div>
                        {s.parentPhone && <div className="text-[11px] text-muted-foreground">Parent: {s.parentPhone}</div>}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">{s.admissionNo}</TableCell>
                      <TableCell className="text-sm">{s.className}{s.sectionName && s.sectionName !== '-' ? ` · ${s.sectionName}` : ''}</TableCell>
                      <TableCell>
                        {currentRouteName ? (
                          <Badge variant="outline" className="gap-1"><RouteIcon className="size-3 text-primary" /> {currentRouteName}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {canEditStudents ? (
                          pickerOpen ? (
                            <div className="flex items-center gap-1.5 justify-end">
                              <Select
                                value={currentRouteId || '__none__'}
                                onValueChange={(val) => assignStudentMut.mutate({ studentId: s.id, routeId: val === '__none__' ? null : val })}
                                disabled={assignStudentMut.isPending}
                              >
                                <SelectTrigger className="h-8 w-[200px] text-xs">
                                  <SelectValue placeholder="Choose route…" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">— Unassign —</SelectItem>
                                  {(routes || []).map(r => (
                                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button size="icon" variant="ghost" className="size-8" title="Close" onClick={() => setRoutePickerFor(null)}>
                                <X className="size-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => setRoutePickerFor({ studentId: s.id, currentRouteId: currentRouteId || null })}>
                              <Layers className="size-3.5" /> {currentRouteName ? 'Change' : 'Assign Route'}
                            </Button>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">View only</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============ Skeleton helper ============

function TableBodySkeletonCell({ colSpan }: { colSpan: number }) {
  return (
    <TableCell colSpan={colSpan} className="p-3">
      <Skeleton className="h-8 w-full" />
    </TableCell>
  )
}

// ============ Vehicle Create/Edit Dialog ============
function VehicleFormDialog({
  mode, target, loading, onClose, onSubmit,
}: {
  mode: 'create' | 'edit'
  target?: Vehicle
  loading: boolean
  onClose: () => void
  onSubmit: (data: any) => void
}) {
  const [vehicleNo, setVehicleNo] = useState(target?.vehicleNo ?? '')
  const [type, setType] = useState(target?.type ?? 'Bus')
  const [capacity, setCapacity] = useState(target ? String(target.capacity) : '45')
  const [driverName, setDriverName] = useState(target?.driverName ?? '')
  const [driverPhone, setDriverPhone] = useState(target?.driverPhone ?? '')
  const [routeName, setRouteName] = useState(target?.routeName ?? '')

  const valid = vehicleNo.trim() && driverName.trim() && routeName.trim() && Number(capacity) >= 1

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bus className="size-4 text-primary" />
            {mode === 'create' ? 'Add Vehicle' : 'Edit Vehicle'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Register a new vehicle in the fleet. Fields marked with * are required.' : `Update details for ${target?.vehicleNo}.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="vh-no">Vehicle No. *</Label>
              <Input id="vh-no" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="KA01 AB 1234" />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="vh-cap">Capacity *</Label>
              <Input id="vh-cap" type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="45" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vh-route">Route Name *</Label>
              <Input id="vh-route" value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="Route 7 — Indiranagar" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="vh-driver">Driver Name *</Label>
              <Input id="vh-driver" value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Mr. Suresh" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vh-phone">Driver Phone</Label>
              <Input id="vh-phone" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!valid || loading}
            onClick={() => onSubmit({
              vehicleNo: vehicleNo.trim(),
              type,
              capacity: Number(capacity),
              driverName: driverName.trim(),
              driverPhone: driverPhone.trim() || undefined,
              routeName: routeName.trim(),
            })}
          >
            {loading ? 'Saving…' : mode === 'create' ? 'Create Vehicle' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ Driver Create/Edit Dialog ============
function DriverFormDialog({
  mode, target, loading, onClose, onSubmit,
}: {
  mode: 'create' | 'edit'
  target?: Driver
  loading: boolean
  onClose: () => void
  onSubmit: (data: any) => void
}) {
  const [name, setName] = useState(target?.name ?? '')
  const [phone, setPhone] = useState(target?.phone ?? '')
  const [licenseNo, setLicenseNo] = useState(target?.licenseNo ?? '')
  const [address, setAddress] = useState(target?.address ?? '')
  const [status, setStatus] = useState(target?.status ?? 'Active')

  const valid = name.trim() && phone.trim()

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IdCard className="size-4 text-primary" />
            {mode === 'create' ? 'Add Driver' : 'Edit Driver'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Create a new driver profile. Name and phone are required.' : `Update profile for ${target?.name}.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dr-name">Full Name *</Label>
              <Input id="dr-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mr. Suresh Kumar" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dr-phone">Phone *</Label>
              <Input id="dr-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dr-lic">License No</Label>
            <Input id="dr-lic" value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} placeholder="KA01 20180012345" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dr-addr">Address</Label>
            <Input id="dr-addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123, MG Road, Bangalore" />
          </div>
          {mode === 'edit' && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="OnLeave">On Leave</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!valid || loading}
            onClick={() => onSubmit({
              name: name.trim(),
              phone: phone.trim(),
              licenseNo: licenseNo.trim() || null,
              address: address.trim() || null,
              status,
            })}
          >
            {loading ? 'Saving…' : mode === 'create' ? 'Create Driver' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ Route Create/Edit Dialog ============
function RouteFormDialog({
  mode, target, vehicles, loading, onClose, onSubmit,
}: {
  mode: 'create' | 'edit'
  target?: RouteInfo
  vehicles: Vehicle[]
  loading: boolean
  onClose: () => void
  onSubmit: (data: any) => void
}) {
  const [name, setName] = useState(target?.name ?? '')
  const [description, setDescription] = useState(target?.description ?? '')
  const [status, setStatus] = useState(target?.status ?? 'Active')
  const [vehicleId, setVehicleId] = useState('')

  const valid = name.trim()

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RouteIcon className="size-4 text-primary" />
            {mode === 'create' ? 'Add Route' : 'Edit Route'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Define a new transport route. You can optionally assign a bus to it immediately.'
              : `Update details for ${target?.name}.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="rt-name">Route Name *</Label>
            <Input id="rt-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Route 7 — Indiranagar" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rt-desc">Description</Label>
            <Input id="rt-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Covers Indiranagar, Koramangala, Domlur" />
          </div>
          {mode === 'edit' && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {mode === 'create' && vehicles.length > 0 && (
            <div className="space-y-1.5">
              <Label>Assign a bus (optional)</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="— None —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.vehicleNo} · {v.routeName || 'No current route'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">The selected bus will immediately start serving this route.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!valid || loading}
            onClick={() => onSubmit({
              name: name.trim(),
              description: description.trim() || null,
              status,
              vehicleId: mode === 'create' && vehicleId && vehicleId !== '__none__' ? vehicleId : undefined,
            })}
          >
            {loading ? 'Saving…' : mode === 'create' ? 'Create Route' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ Stop Create/Edit Dialog ============
function StopFormDialog({
  mode = 'create',
  defaultRouteName = '',
  target,
  loading, onClose, onSubmit,
}: {
  mode?: 'create' | 'edit'
  defaultRouteName?: string
  target?: Stop
  loading: boolean
  onClose: () => void
  onSubmit: (data: any) => void
}) {
  const [name, setName] = useState(target?.name ?? '')
  const [routeName, setRouteName] = useState(target?.routeName ?? defaultRouteName)
  const [lat, setLat] = useState(target ? String(target.lat) : '')
  const [lng, setLng] = useState(target ? String(target.lng) : '')
  const [pickupTime, setPickupTime] = useState(target?.pickupTime ?? '07:00')
  const [dropTime, setDropTime] = useState(target?.dropTime ?? '15:30')
  const [fare, setFare] = useState(target ? String(target.fare) : '0')

  const valid = name.trim() && routeName.trim() && Number(lat) !== 0 && Number(lng) !== 0 && Number(fare) >= 0

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="size-4 text-primary" />
            {mode === 'edit' ? 'Edit Stop' : 'Add Route Stop'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? `Update details for ${target?.name}.`
              : 'Define a pickup/drop stop with GPS coordinates and timing. Fields marked with * are required.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="st-name">Stop Name *</Label>
              <Input id="st-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Indiranagar 100ft Rd" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-route">Route Name *</Label>
              <Input id="st-route" value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="Route 7 — Indiranagar" disabled={!!defaultRouteName} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="st-lat">Latitude *</Label>
              <Input id="st-lat" type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="12.9716" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-lng">Longitude *</Label>
              <Input id="st-lng" type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="77.6058" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="st-pickup">Pickup Time</Label>
              <Input id="st-pickup" type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-drop">Drop Time</Label>
              <Input id="st-drop" type="time" value={dropTime} onChange={(e) => setDropTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-fare">Fare (₹) *</Label>
            <Input id="st-fare" type="number" min="0" value={fare} onChange={(e) => setFare(e.target.value)} placeholder="1200" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!valid || loading}
            onClick={() => onSubmit({
              name: name.trim(),
              routeName: routeName.trim(),
              lat: Number(lat),
              lng: Number(lng),
              pickupTime,
              dropTime,
              fare: Number(fare),
            })}
          >
            {loading ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Add Stop'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ Map helper widgets ============

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-muted/50">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-0.5"><Icon className="size-3" /> {label}</div>
      <div className="text-sm font-medium tabular-nums truncate">{value}</div>
    </div>
  )
}

function LiveMap({ vehicles, stops, selectedId, onSelect }: {
  vehicles: LiveVehicle[]; stops: Stop[]; selectedId?: string; onSelect: (id: string) => void
}) {
  const W = 600, H = 420
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(t => t+1), 1500); return () => clearInterval(t) }, [])

  return (
    <div className="relative bg-emerald-950/95 dark:bg-emerald-950" style={{ aspectRatio: `${W}/${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full">
        {/* Grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          </pattern>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(16,185,129,0.4)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0)" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />

        {/* Fake road network — decorative paths */}
        {[
          'M 40 60 Q 200 100 320 180 T 560 360',
          'M 80 380 Q 200 300 380 240 T 560 80',
          'M 300 20 L 300 400',
          'M 20 200 L 580 200',
          'M 120 40 Q 250 250 480 380',
        ].map((d, i) => (
          <path key={i} d={d} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" strokeLinecap="round" strokeDasharray={i % 2 ? '0' : '8 6'} />
        ))}

        {/* School location (center) */}
        {(() => { const p = project(12.9716, 77.6058, W, H); return (
          <g>
            <circle cx={p.x} cy={p.y} r="28" fill="url(#glow)" />
            <circle cx={p.x} cy={p.y} r="10" fill="#10b981" stroke="#fff" strokeWidth="2" />
            <text x={p.x} y={p.y - 16} fill="#fff" fontSize="10" textAnchor="middle" fontWeight="600">🏫 School</text>
          </g>
        )})()}

        {/* Stops */}
        {stops.map((s, i) => { const p = project(s.lat, s.lng, W, H); return (
          <g key={s.id}>
            <circle cx={p.x} cy={p.y} r="4" fill="#fbbf24" stroke="#fff" strokeWidth="1" opacity="0.8" />
            {i % 2 === 0 && <text x={p.x + 7} y={p.y + 3} fill="rgba(255,255,255,0.6)" fontSize="8">{s.name}</text>}
          </g>
        )})}

        {/* Vehicle markers */}
        {vehicles.map((v, i) => {
          if (!v.lat || !v.lng) return null
          const p = project(v.lat, v.lng, W, H)
          const color = VEH_COLORS[i % VEH_COLORS.length]
          const isSel = selectedId === v.id
          // heading vector for direction arrow
          const rad = (v.heading * Math.PI) / 180
          const ax = p.x + Math.sin(rad) * 14
          const ay = p.y - Math.cos(rad) * 14
          return (
            <g key={v.id} className="cursor-pointer" onClick={() => onSelect(v.id)}>
              {v.status === 'Moving' && <circle cx={p.x} cy={p.y} r={isSel ? 22 : 16} fill={color} opacity="0.15" className="animate-ping" />}
              <circle cx={p.x} cy={p.y} r={isSel ? 12 : 9} fill={color} stroke="#fff" strokeWidth="2" />
              {v.status === 'Moving' && <path d={`M ${p.x} ${p.y} L ${ax} ${ay}`} stroke="#fff" strokeWidth="2" strokeLinecap="round" />}
              <text x={p.x} y={p.y + 1} fill="#fff" fontSize="8" textAnchor="middle" fontWeight="700">{i+1}</text>
              {isSel && <text x={p.x} y={p.y - 16} fill="#fff" fontSize="9" textAnchor="middle" fontWeight="600">{v.vehicleNo}</text>}
            </g>
          )
        })}
      </svg>

      {/* Map overlay HUD */}
      <div className="absolute top-3 left-3 bg-black/50 backdrop-blur rounded-lg px-2.5 py-1.5 text-white text-[11px]">
        <div className="flex items-center gap-1.5"><Navigation className="size-3 text-emerald-400" /> Bangalore · Live</div>
        <div className="text-white/60 text-[10px]">{vehicles.length} vehicles tracked</div>
      </div>
      <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur rounded-lg px-2.5 py-1.5 text-white text-[10px] flex items-center gap-3">
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-400" /> Moving</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-amber-400" /> Stop</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-rose-400" /> Idle</span>
      </div>
      <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur rounded-lg px-2 py-1 text-white/70 text-[10px] tabular-nums">
        {new Date().toLocaleTimeString('en-IN')} · tick {tick}
      </div>
    </div>
  )
}
