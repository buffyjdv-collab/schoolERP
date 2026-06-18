// Transport GPS Tracking mini-service (port 3003)
// Simulates 6 school buses moving along their routes in Bangalore.
// Broadcasts live vehicle positions via socket.io.
// Also POSTs updates to the ERP API every 5s for persistence.
import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = 3003

// Route definitions (Bangalore) — vehicles loop along these waypoint sequences
const routes = [
  { name: 'Route 1 - North', waypoints: [[13.0358,77.5970],[13.0310,77.5865],[13.0090,77.5830],[12.9850,77.5950],[12.9716,77.6058]] },
  { name: 'Route 2 - South', waypoints: [[12.9250,77.5938],[12.9166,77.6101],[12.9050,77.5995],[12.9352,77.6245],[12.9716,77.6058]] },
  { name: 'Route 3 - East',  waypoints: [[12.9719,77.6412],[12.9352,77.6245],[12.9116,77.6473],[12.9352,77.6245],[12.9716,77.6058]] },
  { name: 'Route 4 - West',  waypoints: [[12.9921,77.5556],[12.9716,77.5360],[12.9930,77.5430],[12.9850,77.5950],[12.9716,77.6058]] },
  { name: 'Route 5 - Central', waypoints: [[12.9756,77.6056],[12.9716,77.6058],[12.9650,77.6030],[12.9716,77.6058]] },
  { name: 'Route 6 - Airport', waypoints: [[13.0358,77.5970],[13.1007,77.5963],[13.1986,77.7066],[13.1007,77.5963],[13.0358,77.5970]] },
]

// Vehicle state
const vehicles = routes.map((r, i) => ({
  id: `veh-${i+1}`,
  vehicleNo: `KA01 AB ${String(1000 + i)}`,
  routeName: r.name,
  driverName: `Driver ${i+1}`,
  waypoints: r.waypoints,
  segIndex: 0,         // current segment
  progress: 0,         // 0..1 along current segment
  speed: 0,            // km/h
  heading: 0,
  lat: r.waypoints[0][0],
  lng: r.waypoints[0][1],
  status: 'Moving',
  stoppedUntil: 0,     // timestamp until which bus is stopped at a stop
}))

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  path: '/',
})

// haversine distance (km)
function distKm(a: [number,number], b: [number,number]) {
  const R = 6371
  const dLat = (b[0]-a[0]) * Math.PI/180
  const dLng = (b[1]-a[1]) * Math.PI/180
  const la1 = a[0] * Math.PI/180, la2 = b[0] * Math.PI/180
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function bearing(a: [number,number], b: [number,number]) {
  const la1 = a[0]*Math.PI/180, la2 = b[0]*Math.PI/180
  const dLng = (b[1]-a[1])*Math.PI/180
  const y = Math.sin(dLng) * Math.cos(la2)
  const x = Math.cos(la1)*Math.sin(la2) - Math.sin(la1)*Math.cos(la2)*Math.cos(dLng)
  return (Math.atan2(y,x) * 180/Math.PI + 360) % 360
}

const TICK_MS = 1500 // simulation tick

function step() {
  const now = Date.now()
  for (const v of vehicles) {
    if (now < v.stoppedUntil) {
      v.speed = 0
      v.status = 'Stopped'
      continue
    }
    const from = v.waypoints[v.segIndex]
    const to = v.waypoints[(v.segIndex + 1) % v.waypoints.length]
    const segLen = distKm(from, to)
    // pick a cruising speed 25-45 km/h
    const cruise = 25 + Math.random() * 20
    v.speed = Math.round(cruise)
    // distance covered this tick
    const covered = (cruise * (TICK_MS / 1000)) / 3600 // km
    v.progress += segLen > 0 ? covered / segLen : 1
    v.heading = Math.round(bearing(from, to))
    if (v.progress >= 1) {
      v.progress = 0
      v.segIndex = (v.segIndex + 1) % v.waypoints.length
      // arrived at a stop — pause 15-40s to simulate pickup/drop
      v.stoppedUntil = now + (15 + Math.random() * 25) * 1000
      v.lat = to[0]; v.lng = to[1]
      v.status = 'Stopped'
    } else {
      v.lat = from[0] + (to[0] - from[0]) * v.progress
      v.lng = from[1] + (to[1] - from[1]) * v.progress
      v.status = 'Moving'
    }
  }
  // broadcast
  io.emit('vehicles:update', vehicles.map(v => ({
    id: v.id, vehicleNo: v.vehicleNo, routeName: v.routeName, driverName: v.driverName,
    lat: v.lat, lng: v.lng, speed: v.speed, heading: v.heading, status: v.status,
    lastUpdate: new Date().toISOString(),
  })))
}

// persistence: POST to ERP API every 10s (mapped to vehicle records by routeName)
async function persist() {
  try {
    const payload = vehicles.map(v => ({
      // ERP identifies by vehicleNo via a lookup; we send routeName + position
      id: v.routeName, lat: v.lat, lng: v.lng, speed: v.speed, heading: v.heading, status: v.status,
    }))
    await fetch('http://localhost:3000/api/transport/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (e) {
    // ERP may not be up yet; ignore
  }
}

io.on('connection', (socket) => {
  console.log('[transport] client connected', socket.id)
  // send snapshot immediately
  socket.emit('vehicles:update', vehicles.map(v => ({
    id: v.id, vehicleNo: v.vehicleNo, routeName: v.routeName, driverName: v.driverName,
    lat: v.lat, lng: v.lng, speed: v.speed, heading: v.heading, status: v.status,
    lastUpdate: new Date().toISOString(),
  })))
  socket.on('disconnect', () => console.log('[transport] client disconnected', socket.id))
})

httpServer.listen(PORT, () => {
  console.log(`[transport-tracker] listening on :${PORT}`)
  setInterval(step, TICK_MS)
  setInterval(persist, 10000)
})
