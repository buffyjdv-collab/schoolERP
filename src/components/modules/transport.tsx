'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useCan } from '@/lib/store'
import { StatCard, SectionHeader, StatusBadge } from '@/components/erp/primitives'
import type { Vehicle } from '@/lib/types'
import {
  Bus, Users, Gauge, MapPin, Navigation, Radio, Fuel, Activity, Phone, Square, Circle, Triangle,
  Plus, Pencil, Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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

// Bangalore city bounds for our map projection
const BOUNDS = { minLat: 12.88, maxLat: 13.25, minLng: 77.50, maxLng: 77.75 }

function project(lat: number, lng: number, w: number, h: number) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * w
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * h
  return { x, y }
}

// Vehicle colors by index
const VEH_COLORS = ['#10b981', '#14b8a6', '#f59e0b', '#f43f5e', '#8b5cf6', '#0ea5e9']

interface LiveVehicle {
  id: string; vehicleNo: string; routeName: string; driverName: string
  lat: number; lng: number; speed: number; heading: number; status: string
  lastUpdate: string
}

interface Stop {
  id: string; name: string; routeName: string; lat: number; lng: number
  pickupTime: string; dropTime: string; fare: number
}

const VEHICLE_TYPES = ['Bus', 'Mini Bus', 'Van', 'Car'] as const

export function TransportModule() {
  const [liveVehicles, setLiveVehicles] = useState<LiveVehicle[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const qc = useQueryClient()

  const canCreate = useCan()('transport', 'create')
  const canEdit = useCan()('transport', 'edit')
  const canDelete = useCan()('transport', 'delete')

  const [vehicleDialog, setVehicleDialog] = useState<{ mode: 'create' | 'edit'; target?: Vehicle } | null>(null)
  const [vehicleDelete, setVehicleDelete] = useState<Vehicle | null>(null)
  const [stopDialog, setStopDialog] = useState(false)
  const [stopDelete, setStopDelete] = useState<Stop | null>(null)

  const { data: vehicles, isLoading } = useQuery({ queryKey: ['vehicles'], queryFn: api.transport.vehicles, refetchInterval: connected ? false : 3000 })
  const { data: stops } = useQuery({ queryKey: ['stops'], queryFn: api.transport.stops })

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

  // Connect to live GPS tracker mini-service via socket.io (port 3003, XTransformPort)
  useEffect(() => {
    const socket = io('/?XTransformPort=3003', { transports: ['websocket', 'polling'], forceNew: true, reconnection: true })
    socketRef.current = socket
    socket.on('connect', () => { setConnected(true); toast.success('Live GPS tracking connected') })
    socket.on('disconnect', () => setConnected(false))
    socket.on('vehicles:update', (data: LiveVehicle[]) => {
      setLiveVehicles(data)
      // refresh the persisted vehicle list occasionally
    })
    return () => { socket.disconnect() }
  }, [])

  const merged: LiveVehicle[] = liveVehicles.length ? liveVehicles : (vehicles || []).map(v => ({
    id: v.id, vehicleNo: v.vehicleNo, routeName: v.routeName, driverName: v.driverName,
    lat: v.currentLat || 0, lng: v.currentLng || 0, speed: v.speed || 0, heading: v.heading || 0,
    status: v.status, lastUpdate: v.lastUpdate || new Date().toISOString(),
  }))

  const moving = merged.filter(v => v.status === 'Moving').length
  const stopped = merged.filter(v => v.status === 'Stopped').length
  const selected = merged.find(v => v.id === selectedId) || merged[0]
  // Original vehicle record (with all fields) for edit/delete operations
  const selectedVehicle: Vehicle | undefined = (vehicles || []).find(v => v.id === selected?.id)

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Fleet" value={merged.length} sub="Buses & Vans" icon={Bus} accent="primary" loading={isLoading} />
        <StatCard label="Moving Now" value={moving} sub="Live on route" icon={Navigation} accent="emerald" loading={isLoading} />
        <StatCard label="At Stops" value={stopped} sub="Loading/unloading" icon={MapPin} accent="amber" loading={isLoading} />
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
            <LiveMap vehicles={merged} stops={stops || []} selectedId={selected?.id} onSelect={setSelectedId} />
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
                {isLoading ? Array.from({length:6}).map((_,i) => <Skeleton key={i} className="h-16 w-full" />) :
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
              {(stops || []).length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-8">No route stops configured.</div>
              ) : (stops || []).map(s => (
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

// ============ Stop Create Dialog ============
function StopFormDialog({
  loading, onClose, onSubmit,
}: {
  loading: boolean
  onClose: () => void
  onSubmit: (data: any) => void
}) {
  const [name, setName] = useState('')
  const [routeName, setRouteName] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [pickupTime, setPickupTime] = useState('07:00')
  const [dropTime, setDropTime] = useState('15:30')
  const [fare, setFare] = useState('0')

  const valid = name.trim() && routeName.trim() && Number(lat) !== 0 && Number(lng) !== 0 && Number(fare) >= 0

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="size-4 text-primary" /> Add Route Stop
          </DialogTitle>
          <DialogDescription>
            Define a pickup/drop stop with GPS coordinates and timing. Fields marked with * are required.
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
              <Input id="st-route" value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="Route 7 — Indiranagar" />
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
            {loading ? 'Saving…' : 'Add Stop'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-muted/50">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-0.5"><Icon className="size-3" /> {label}</div>
      <div className="text-sm font-medium tabular-nums truncate">{value}</div>
    </div>
  )
}

function LiveMap({ vehicles, stops, selectedId, onSelect }: {
  vehicles: LiveVehicle[]; stops: any[]; selectedId?: string; onSelect: (id: string) => void
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

        {/* Vehicle trails (simple line from last position) */}
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
