import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Heuristic: Prisma cuid ids start with 'c' and are 20+ chars of [0-9a-z].
// The seed stored teacher names directly in `teacherId` (e.g. "Mr. Rajesh Verma"),
// so we resolve any non-id-looking value as a literal name.
const CUID_RE = /^c[a-z0-9]{20,}$/i

function resolveTeacher(stored: string | null, lookup: Map<string, string>): string | null {
  if (!stored) return null
  // If it's a real Employee id, use the resolved name
  if (CUID_RE.test(stored)) {
    return lookup.get(stored) ?? null
  }
  // Otherwise the stored value IS the teacher's name (seed data)
  return stored
}

export async function GET() {
  // Resolve teacher names in one pass (sections + subjects)
  const teacherIds = new Set<string>()
  const classes = await db.class.findMany({
    include: {
      sections: { include: { _count: { select: { students: true } } } },
      subjects: true,
      _count: { select: { students: true } },
    },
    orderBy: { name: 'asc' },
  })
  for (const c of classes) {
    for (const s of c.sections) if (s.teacherId && CUID_RE.test(s.teacherId)) teacherIds.add(s.teacherId)
    for (const s of c.subjects) if (s.teacherId && CUID_RE.test(s.teacherId)) teacherIds.add(s.teacherId)
  }
  const employees = teacherIds.size
    ? await db.employee.findMany({ where: { id: { in: Array.from(teacherIds) } }, select: { id: true, firstName: true, lastName: true } })
    : []
  const teacherName = new Map<string, string>(employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`.trim()]))

  return NextResponse.json(classes.map((c) => ({
    id: c.id,
    name: c.name,
    sections: c.sections.map((s) => ({
      id: s.id, name: s.name, capacity: s.capacity,
      teacherId: s.teacherId || null,
      teacherName: resolveTeacher(s.teacherId, teacherName),
      studentCount: s._count.students,
    })),
    subjects: c.subjects.map((s) => ({
      id: s.id, name: s.name, code: s.code,
      teacherId: s.teacherId || null,
      teacherName: resolveTeacher(s.teacherId, teacherName),
    })),
    subjectCount: c.subjects.length,
    studentCount: c._count.students,
  })))
}
