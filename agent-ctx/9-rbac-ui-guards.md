# Task 9 — rbac-ui-guards (module-level permission guards on 5 module UI files)

## Task
Add module-level RBAC permission guards to 5 existing ERP module UI files using the `useCan()` hook from `@/lib/store`. The RBAC system was already built; the backend already enforces permissions. This task was purely additive UI guards (hide actions for restricted roles, never break existing admin/teacher functionality).

## Files Modified

1. `src/components/modules/attendance.tsx` (`AttendanceModule`)
2. `src/components/modules/exams.tsx` (`ExamsModule`)
3. `src/components/modules/hr.tsx` (`HrModule`)
4. `src/components/modules/library.tsx` (`LibraryModule`)
5. `src/components/modules/communication.tsx` (`CommunicationModule`)

## Permission Matrix Used (from `src/lib/rbac.ts`)
- `admin` / `super_admin`: full access to all actions
- `teacher`: students[view,edit], attendance[view,mark], exams[view,enter], library[view,issue,return], communication[view,send], fees[view] (NO collect, NO pay)
- `student`: students[view], attendance[view], exams[view], fees[view,pay], library[view], communication[view] (NO mark, NO enter, NO issue, NO send)
- `parent`: students[view], attendance[view], exams[view], fees[view,pay], library[view], communication[view] (same as student + can pay fees)

## Guards Added

### 1. attendance.tsx
- Imported `useCan`, `useStore` from `@/lib/store`; `AuthUser` from `@/lib/rbac`; `AttendanceRecord` from `@/lib/types`; `CalendarDays` from lucide-react.
- New `MyAttendancePanel({ user })` component (~210 lines, read-only) for students/parents:
  - Resolves linked student ids from `user.studentId` (student) or `user.childrenStudentIds` (parent).
  - Parent with multiple children → child selector dropdown (fetches visible students via `api.students.list()`, which the backend scopes to the parent's children).
  - Fetches `api.students.attendance(activeStudentId)`.
  - Computes last-30-day rate from records, renders a big colored rate number (emerald ≥90, amber ≥75, rose <75) + "Present / Marked" tile.
  - 30-day calendar grid (`grid-cols-7 sm:grid-cols-10`): emerald=Present, rose=Absent, amber=Late, sky=Leave, violet=HalfDay, muted=not marked; each cell shows date number + tooltip.
  - "Recent Statuses" card listing the last 10 entries with status dot, date, method.
  - EmptyState "No linked student" edge-case handler.
- `AttendanceModule` main: reads `canMark = useCan()('attendance','mark')` + `user`.
  - Tabs `defaultValue` is `canMark ? 'mark' : 'mine'`.
  - TabsList conditionally renders Mark Attendance (staff) OR My Attendance/My Children (students/parents); UHF/RFID Live stays for all.
  - TabsContent for "mark" (MarkAttendancePanel + ClassWiseAttendance) only when `canMark`; otherwise TabsContent for "mine" → MyAttendancePanel.
  - 5 StatCards (Attendance Rate, Present Today, Absent Today, Late Today, On Leave) stay for all — backend already role-scopes the summary.
  - Existing teacher/admin mark-attendance flow untouched.

### 2. exams.tsx
- Imported `useCan`, `useStore`.
- `ExamsModule` main: reads `canEnter = useCan()('exams','enter')` + `isStudentOrParent`.
  - `effectiveClassId = isStudentOrParent ? '' : (classId || classes[0]?.id ?? '')` — backend scopes marks to own/children regardless of classId.
  - Class selector in exam header hidden for students/parents (replaced with italic "Scoped to your record" / "Scoped to your children" note).
  - When `canEnter`, shows an emerald "Can enter marks" badge next to the class selector.
  - Exam list, Progress Card, Analysis tabs all stay visible to all (read-only).
- `MarksSheetTab`: added `useStore` to read `user`. For parents:
  - Derives `childrenWithMarks` from `user.childrenStudentIds` ∩ marks.
  - Renders a child selector dropdown at the top of the card header (only when >1 child has marks).
  - Filters marks client-side to the selected child.
  - The `useMemo` (subjects/rows/subjectAverages) consumes the filtered `marks` array — re-computes on child change.
- Added defensive comment: future marks-entry UI MUST be wrapped in `useCan()('exams','enter')`. No marks-entry input existed, so nothing to wrap; documented for future maintainers.

### 3. hr.tsx
- Imported `useCan`; added `ShieldAlert` icon.
- `HrModule` main: defensive `canView = useCan()('hr','view')` guard.
  - All 3 useQuery hooks (employees, leaves, payroll) pass `enabled: canView` so they don't fire when user can't access HR.
  - If `!canView`, renders `<EmptyState icon={ShieldAlert} title="Access Denied" description="You do not have permission to view the HR & Payroll module. Please contact an administrator if you believe this is an error." />` instead of loading data. Handles direct navigation edge case.
- `LeavesTab`: `canApprove = useCan()('hr','approve')`. Pending rows show HOD/Principal/Reject buttons (when `canApprove`) OR italic "View only" text. Resolved rows still show "Resolved".
- `PayrollTab`: `canRun = useCan()('hr','run')`. "Run Payroll" button wrapped in `{canRun && ...}`. Month selector, payroll table, totals footer, Mark Paid action stay visible.

### 4. library.tsx
- Imported `useCan`.
- `CatalogTab`: `canIssue = useCan()('library','issue')`. Per-book action cell:
  - `canIssue` → existing "Issue" / "Unavailable" button (admin/teacher).
  - `!canIssue` && out → "Unavailable" text (rose).
  - `!canIssue` && available → "Available" text (emerald).
  - `<IssueBookDialog>` only mounted when `canIssue` (defensive).
- `IssuedTab`: `canReturn = useCan()('library','return')`. Per-issue action cell:
  - status=Issued && `canReturn` → existing "Return" button.
  - status=Issued && `!canReturn` → italic "Issued" text (read-only).
  - status≠Issued → return date or "—" (unchanged).
  - Backend already scopes the issues list to the user's own/children's issues for students/parents.

### 5. communication.tsx
- Imported `useCan`.
- `ComposeCard`: `canSend = useCan()('communication','send')`.
  - "Send {channel}" button wrapped in `{canSend ? <Button>...</Button> : <notice>}`.
  - When `!canSend`: replaces Send button with an amber-tinted notice card: "Sending is restricted to staff. You can still draft messages and use AI Compose."
  - AI Compose panel, channel selector, recipient/subject/message inputs, Category select all stay visible to all (per spec — AI just drafts, doesn't send).
- Message History card unchanged — all roles can view (backend scopes appropriately).

## Conventions Followed
- `'use client'` first line preserved on all 5 files.
- `useCan` / `useStore` imported from `@/lib/store`.
- Existing shadcn components + shared `EmptyState` primitive from `@/components/erp/primitives` reused.
- No API calls or backend changes — purely UI guards.
- Emerald/teal accent only (NO indigo/blue).
- Responsive (mobile-first with sm/md/lg/xl breakpoints).
- All guards are ADDITIVE: hide for restricted roles, keep for admin. Admin/super_admin/teacher retain 100% of existing functionality.

## Verification
- ESLint: `bun node_modules/eslint/bin/eslint.js src/components/modules/attendance.tsx src/components/modules/exams.tsx src/components/modules/hr.tsx src/components/modules/library.tsx src/components/modules/communication.tsx` → exit 0, 0 errors, 0 warnings.
- TypeScript: `bunx tsc --noEmit` → no errors in any of the 5 modified files (only pre-existing errors in unrelated files: examples/websocket, mini-services/transport-tracker, skills/*, src/app/api/hr/payroll/route, src/components/erp/sidebar, src/components/modules/students).
- Dev log: `✓ Compiled in 307ms` etc. — no compile errors after edits; transport tracker still streaming 200s.

## Stage Summary
5 module files now enforce RBAC at the UI layer in addition to the existing backend enforcement. All guards are additive and don't break any existing admin/teacher flows. Students/parents see appropriate read-only views with their scoped data. Lint status: 5 files, 0 errors, 0 warnings, exit 0.
