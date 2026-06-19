# Task ID: PERM-FIX
# Agent: main
# Task: Add permission checks to unprotected API routes (3-layer RBAC enforcement)

## Context
Read `/home/z/my-project/worklog.md` to understand the architecture. The ERP uses a 3-layer RBAC system (hardcoded defaults → DB role overrides → DB per-user overrides) with `requirePerm(module, action)` in `src/lib/auth.ts` which calls `canUser()` (checks role overrides + user overrides). 16 API routes were UNPROTECTED — no auth check at all. Added `requirePerm()` / `getCurrentUser()` + `canUser()` to each.

## Reference Helpers (from src/lib/auth.ts and src/lib/rbac.ts)
```typescript
import { requirePerm } from '@/lib/auth'
// Usage:
const guard = await requirePerm('library', 'view')
if (!guard.ok) return guard.res
// guard.user is available for data scoping
```

```typescript
import { getCurrentUser } from '@/lib/auth'
import { canUser } from '@/lib/rbac'
const user = await getCurrentUser()
// AuthUser fields used: id, role, studentId?, teacherClassIds[], childrenStudentIds[]
```

## Routes Fixed (16 total)

### Group A — Simple `requirePerm(module, action)` checks (7 routes)
| # | Route | Method | Module | Action |
|---|-------|--------|--------|--------|
| 1 | `/api/library/books/route.ts` | GET | library | view |
| 2 | `/api/library/issues/[id]/return/route.ts` | POST | library | return |
| 3 | `/api/academics/classes/route.ts` | GET | academics | view |
| 4 | `/api/academics/timetable/route.ts` | GET | academics | view |
| 5 | `/api/exams/route.ts` | GET | exams | view |
| 6 | `/api/fees/summary/route.ts` | GET | fees | view |
| 7 | `/api/transport/stops/route.ts` | GET | transport | view |

Notes:
- None of these routes had a POST handler — `POST (if exists)` clauses in the spec were skipped because no POST existed.
- Pattern: import `requirePerm` from `@/lib/auth`; add `const guard = await requirePerm('module', 'action'); if (!guard.ok) return guard.res` as the FIRST statement of the handler before any DB queries.

### Group B — Staff-only `getCurrentUser()` check (6 routes)
| # | Route | Method |
|---|-------|--------|
| 8 | `/api/dashboard/activity/route.ts` | GET |
| 9 | `/api/dashboard/attendance-trend/route.ts` | GET |
| 10 | `/api/dashboard/class-distribution/route.ts` | GET |
| 11 | `/api/dashboard/fee-trend/route.ts` | GET |
| 12 | `/api/dashboard/gender-ratio/route.ts` | GET |
| 13 | `/api/ai/insights/route.ts` | GET |

Pattern:
```typescript
import { getCurrentUser } from '@/lib/auth'
// ...
const me = await getCurrentUser()
if (!me || (me.role !== 'super_admin' && me.role !== 'admin' && me.role !== 'teacher'))
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
```

### Group C — Any-authenticated-user `getCurrentUser()` check (1 route)
| # | Route | Method |
|---|-------|--------|
| 14 | `/api/ai/compose/route.ts` | POST |

Pattern:
```typescript
import { getCurrentUser } from '@/lib/auth'
// ...
const me = await getCurrentUser()
if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

### Group D — Ownership-based access control (`getCurrentUser` + `canUser` + role/ownership checks) (4 routes)
| # | Route | Method | canUser module |
|---|-------|--------|----------------|
| 15 | `/api/students/[id]/route.ts` | GET | students |
| 16 | `/api/students/[id]/attendance/route.ts` | GET | attendance |
| 17 | `/api/students/[id]/fees/route.ts` | GET | fees |
| 18 | `/api/students/[id]/marks/route.ts` | GET | exams |

Pattern (per spec exactly):
```typescript
import { getCurrentUser } from '@/lib/auth'
import { canUser } from '@/lib/rbac'
// ...
const { id } = await params
const user = await getCurrentUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
if (!canUser(user, '<module>', 'view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
// Ownership check:
if (user.role === 'student' && id !== user.studentId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
if (user.role === 'parent' && !user.childrenStudentIds.includes(id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
if (user.role === 'teacher') {
  const s = await db.student.findUnique({ where: { id }, select: { classId: true } })
  if (!s || !user.teacherClassIds.includes(s.classId || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

## Do-NOT-modify list (honored)
- `/api/auth/login/route.ts` — left open (must be open)
- `/api/auth/logout/route.ts` — left open (must be open)
- `/api/transport/update/route.ts` — left open (used by GPS tracker internal service)
- `/api/route.ts` — left open (root health check)

## Conventions Followed
- Permission check is the FIRST statement in each handler (before any DB queries).
- Used `requirePerm` for simple module/action checks; `getCurrentUser` + `canUser` for custom logic.
- Only ADDED permission checks — no existing functionality altered. All `db.*` queries, response shapes, and existing logic preserved verbatim.
- The `requirePerm` result is consumed via the standard `if (!guard.ok) return guard.res` pattern (matching existing protected routes like `/api/library/issues/route.ts`).
- `me` and `user` locals are intentionally used inside the auth-guard conditional, satisfying `@typescript-eslint/no-unused-vars`.

## Verification
- **ESLint**: `cd /home/z/my-project && timeout 120 bun node_modules/eslint/bin/eslint.js src/app/api/ 2>&1 | tail -20` → **exit 0, no output (0 errors, 0 warnings)** across all 16 modified files plus the rest of the api tree.
- **Dev log**: API routes still returning 200s for authenticated admin/teacher traffic (e.g. `GET /api/academics/classes 200 in 71ms`, `GET /api/dashboard/activity 200 in 11ms`, `GET /api/dashboard/gender-ratio 200 in 7ms`). No compile errors after the edits.

## Stage Summary
- 16 previously-unprotected API routes now enforce RBAC at the very start of each handler, closing the backend enforcement gap.
- 7 routes use `requirePerm(module, action)` (the 3-layer resolver).
- 6 routes use staff-only `getCurrentUser()` check (super_admin/admin/teacher): 5 dashboard chart routes + ai/insights.
- 1 route uses any-authenticated-user `getCurrentUser()` check: ai/compose.
- 4 routes use ownership-based access control combining `canUser()` + role-specific ownership (student=own, parent=children, teacher=assigned-classes via db.student.classId lookup).
- **Lint status: 16 files, 0 errors, 0 warnings, exit 0.**
