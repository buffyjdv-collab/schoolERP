'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { StatCard, SectionHeader, StatusBadge } from '@/components/erp/primitives'
import type { Vehicle } from '@/lib/types'
import {
  Bus, Users, Gauge, MapPin, Navigation, Radio, Fuel, Activity, Phone, Square, Circle, Triangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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

export function TransportModule() {
  const [liveVehicles, setLiveVehicles] = useState<LiveVehicle[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const qc = useQueryClient()

  const { data: vehicles, isLoading } = useQuery({ queryKey: ['vehicles'], queryFn: api.transport.vehicles, refetchInterval: connected ? false : 3000 })
  const { data: stops } = useQuery({ queryKey: ['stops'], queryFn: api.transport.stops })

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
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Bus className="size-4 text-primary" /> Fleet Status</CardTitle>
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
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Route Stops & Pickups</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-64">
            <div className="p-4 space-y-2">
              {(stops || []).map(s => (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                  <div className="size-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground">{s.routeName}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Pickup: {s.pickupTime}</div>
                  <div className="text-xs text-muted-foreground">Drop: {s.dropTime}</div>
                  <Badge variant="outline" className="text-[10px]">₹{s.fare}</Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
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
