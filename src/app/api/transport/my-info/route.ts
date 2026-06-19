import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// Returns the student/parent's own transport info: their route, bus, stops, driver
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'student' && user.role !== 'parent') {
    return NextResponse.json({ error: 'Only student and parent roles' }, { status: 403 })
  }

  // Determine which student IDs to look up
  let studentIds: string[] = []
  if (user.role === 'student') {
    if (user.studentId) studentIds = [user.studentId]
  } else {
    studentIds = user.childrenStudentIds
  }

  if (!studentIds.length) return NextResponse.json({ routes: [] })

  // Fetch students with their route assignments
  const students = await db.student.findMany({
    where: { id: { in: studentIds } },
    select: {
      id: true, firstName: true, lastName: true, admissionNo: true,
      classId: true, transportRouteId: true, routeId: true,
      class: { select: { name: true } },
    },
  })

  // Collect assigned routeIds
  const routeIds = students
    .map(s => s.routeId)
    .filter((id): id is string => !!id)

  // Also check transportRouteId (legacy string field) — resolve to Route records
  const routeNames = students
    .map(s => s.transportRouteId)
    .filter((id): id is string => !!id)

  const routesByName = await db.route.findMany({ where: { name: { in: routeNames } } })
  const allRouteIds = [...new Set([...routeIds, ...routesByName.map(r => r.id)])]

  if (!allRouteIds.length) {
    return NextResponse.json({
      routes: [],
      students: students.map(s => ({
        id: s.id, name: `${s.firstName} ${s.lastName}`, admissionNo: s.admissionNo,
        className: s.class?.name || '-', routeName: s.transportRouteId || null,
      })),
    })
  }

  // Fetch routes with vehicles, drivers, and stops
  const routes = await db.route.findMany({
    where: { id: { in: allRouteIds } },
    include: {
      vehicles: { include: { driver: true } },
      stops: { orderBy: { pickupTime: 'asc' } },
    },
  })

  const out = routes.map(r => ({
    id: r.id, name: r.name, description: r.description, status: r.status,
    vehicles: r.vehicles.map(v => ({
      id: v.id, vehicleNo: v.vehicleNo, type: v.type, capacity: v.capacity,
      driverName: v.driver?.name || v.driverName,
      driverPhone: v.driver?.phone || v.driverPhone,
      status: v.status,
      currentLat: v.currentLat, currentLng: v.currentLng,
      speed: v.speed, heading: v.heading,
      lastUpdate: v.lastUpdate?.toISOString() || null,
    })),
    stops: r.stops.map(s => ({
      id: s.id, name: s.name, pickupTime: s.pickupTime, dropTime: s.dropTime,
      fare: s.fare, lat: s.lat, lng: s.lng,
    })),
  }))

  return NextResponse.json({
    routes: out,
    students: students.map(s => ({
      id: s.id, name: `${s.firstName} ${s.lastName}`, admissionNo: s.admissionNo,
      className: s.class?.name || '-', routeName: s.transportRouteId || null,
      routeId: s.routeId || routesByName.find(rn => rn.name === s.transportRouteId)?.id || null,
    })),
  })
}
