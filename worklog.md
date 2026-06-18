# Enterprise School ERP - Worklog

This file tracks work across all agents working on the School ERP project.

## Project Overview
A Vidyalaya-style Enterprise School ERP built with Next.js 16 (single `/` route, client-side module navigation via Zustand). 
- Database: Prisma + SQLite (file: db/custom.db), schema in prisma/schema.prisma
- Master entities: Student, Employee, Class, Section, Subject, Vehicle, Book, Asset, FeeStructure, Exam
- Seed: `bun prisma/seed.ts` → 463 students, 35 employees, 12038 attendance, 2778 fee invoices, exams, timetable, 6 vehicles w/ GPS, library, assets.

## Architecture Decisions
- **Single route**: All modules render in `/` via Zustand `activeModule` state. Sidebar switches modules. NO other page routes.
- **API routes**: under `src/app/api/<module>/route.ts` — all return JSON.
- **State**: Zustand (`src/lib/store.ts`) for navigation; TanStack Query for server data (provider in layout).
- **Transport live GPS**: a mini-service (socket.io) on port 3003 simulates vehicle movement; frontend connects via `io('/?XTransformPort=3003')`.
- **AI**: LLM skill via `z-ai-web-dev-sdk` used in backend API routes only (`/api/ai/*`).
- **Theme**: Tailwind with emerald/teal accent (NOT indigo/blue). Light/dark via next-themes.

## File Map (conventions)
- `src/lib/store.ts` — Zustand store (activeModule, sidebar, filters)
- `src/lib/api.ts` — typed fetch helpers for each module
- `src/lib/types.ts` — shared TS types
- `src/components/erp/layout.tsx` — ERP shell (sidebar + topbar + content)
- `src/components/erp/sidebar.tsx` — module navigation
- `src/components/erp/topbar.tsx` — top bar (search, notifications, theme, profile)
- `src/components/modules/<module>.tsx` — one file per module UI
- `src/app/api/<module>/route.ts` — CRUD endpoints

---
Task ID: 1
Agent: main
Task: Build Prisma schema with master entities + seed data

Work Log:
- Designed schema with 20+ models: AcademicYear, Class, Section, Subject, AdmissionEnquiry, Application, Student, Attendance, FeeStructure, FeeInvoice, Exam, ExamClass, ExamMark, TimetableSlot, Vehicle, TransportStop, Book, LibraryIssue, Employee, LeaveRequest, Payroll, Certificate, Notification, Asset
- Ran prisma format + db push + generate
- Wrote seed.ts producing realistic Bangalore-based school data
- Verified counts: 463 students, 35 employees, 12038 attendance, 2778 fee invoices, 6 GPS vehicles, library, assets, payroll

Stage Summary:
- Database fully seeded and ready. Schema stable. Master entities in place for all modules.

---
Task ID: 6,7
Agent: ui-modules
Task: Build Admissions + Academics module UI files

Work Log:
- Read worklog and existing conventions (dashboard module, primitives, types, api, schema, sidebar).
- Extended `ClassInfo` type (`src/lib/types.ts`) to include `subjects[]` and `teacherName` on sections/subjects so the Subjects tab can render real data.
- Updated `/api/academics/classes/route.ts` to:
  - Include subject details (id, name, code, teacherId, teacherName).
  - Resolve teacher names from Employee records when `teacherId` is a real cuid, OR fall back to using the stored string directly (seed data stored the teacher NAME in `teacherId` rather than an Employee id — the heuristic `/^c[a-z0-9]{20,}$/i` distinguishes the two cases).
- Created `/src/components/modules/admissions.tsx` exporting `AdmissionsModule`:
  - Top: SectionHeader + 4 StatCards (Total Enquiries, Pending Applications, Approved This Year, Conversion Rate %).
  - Tabs: Pipeline Overview / Enquiries / Applications.
  - Pipeline Overview: 5-stage horizontal pipeline (Enquiry → Application → Test → Interview → Approved) with per-stage counts (combined from enquiries + applications statuses), percentage badges, totals strip + recent enquiries feed.
  - Enquiries: searchable table (Student / Parent / Phone / Class / Source / Status / Date / Actions) with dropdown to advance or reject status via `api.admissions.updateEnquiry`. Notes shown inline in the dropdown when present.
  - Applications: searchable table (Student / Parent / Class / Previous School / Status / Date / Actions) with "Verify / Schedule Test / Approve & Create Student / Reject" actions via `api.admissions.updateApplication`. Approve toasts "Student master record created".
  - New Enquiry dialog: controlled form (studentName, parentName, phone, email, classApplied select Class 1..10, source select Website/Walk-in/Referral, message) → `api.admissions.createEnquiry` + query invalidation + toast.
  - Skeletons via `loading` flags, EmptyState when no records, sticky table headers, scroll-thin containers, max-h-[60vh] on tables.
- Created `/src/components/modules/academics.tsx` exporting `AcademicsModule`:
  - SectionHeader "Academic Setup".
  - Two-pane layout: left = scrollable classes list (`max-h-[70vh]`, search input, per-class card with section/subject/student counts, click to select). Right = class header summary card + Tabs.
  - "Sections & Subjects" tab: sections grid (name, capacity, student count with utilisation bar that goes amber at 70%+ and rose at 90%+, class teacher) and subjects table (name, code badge, faculty).
  - "Timetable" tab: weekly grid Mon..Sat × periods with sticky header (and sticky Period column). Cells render subject + teacher + room + time. Section selector dropdown above the grid lets the user filter to a specific section (or "All sections" — first slot per cell wins when collapsed). EmptyState when class not selected or no timetable.
  - Effect-free auto-selection of first class (no set-state-in-effect).
  - Loading skeletons + error/empty states handled.
- Verified endpoints return correct shape after the API change: `/api/academics/classes` now returns `subjects[]` and resolved `teacherName` for both sections and subjects.
- Ran ESLint (`bun node_modules/eslint/bin/eslint.js src/components/modules/admissions.tsx src/components/modules/academics.tsx src/app/api/academics/classes/route.ts`) — clean, 0 errors/warnings.
- Ran `bunx tsc --noEmit` — no errors in any of the new/modified files (only pre-existing errors in other files: hr/payroll route, mini-services, skills — unrelated).
- Checked dev.log — no compile errors for the new modules.

Stage Summary:
- Both `AdmissionsModule` and `AcademicsModule` are production-ready, lint-clean, type-safe, responsive (mobile-first with sm/lg breakpoints), and follow the emerald/teal accent convention.
- API: `GET /api/academics/classes` now returns subjects + resolved teacher names (backward-compatible additions only).
- Types: `ClassInfo` extended with `subjects[]` and `teacherName?` on section/subject — non-breaking.
- No `indigo`/`blue` palette used. All tables wrapped in `max-h-[60vh] overflow-y-auto scroll-thin` containers with sticky headers. All interactive elements have hover states. Loading skeletons via shadcn Skeleton. Empty states via the shared `EmptyState` primitive.

---
Task ID: 8,10
Agent: ui-modules
Task: Build Attendance + Exams module UI files

Work Log:
- Read worklog and existing conventions (dashboard, admissions, academics modules; primitives; types; api; sidebar).
- Extended `Exam` type (`src/lib/types.ts`) with optional `marksCount?: number` (returned by `/api/exams` but previously absent from the type).
- Extended `ExamMark` type with optional `className?: string` (returned by `/api/exams/marks` route — `m.student.class?.name || '-'` — but previously absent from the type). Non-breaking, additive.
- Created `/src/components/modules/attendance.tsx` exporting `AttendanceModule`:
  - Top: SectionHeader + 5 StatCards (Attendance Rate %, Present Today, Absent Today, Late Today, On Leave) sourced from `api.attendance.summary()`.
  - Tabs: "Mark Attendance" / "UHF / RFID Live".
  - Mark Attendance tab — `lg:grid-cols-3` two-column layout:
    - Left (lg:col-span-2) "Mark Attendance" panel: Class selector (Select from `api.academics.classes()`), native `<input type="date">` defaulting to today, fetches `api.attendance.classAttendance(classId, date)`. Per-student status button-group of 5 small color-coded buttons (P/A/L/LV/HD = Present=emerald, Absent=rose, Late=amber, Leave=sky, HalfDay=violet), with the active one filled and others tinted. "Mark All Present" sets all overrides to Present; "Save Attendance" diffs overrides against server statuses and `Promise.all` calls `api.attendance.mark` only for changed rows, then toasts "Attendance saved for N students". Reset edits whenever class or date changes (via onChange handlers, no set-state-in-effect). Dirty rows highlighted with bg-primary/5 + pulse dot. Count summary strip at top (Present/Absent/Late/Leave/HalfDay/Total) updates live. Tables wrapped in `max-h-[60vh] overflow-y-auto scroll-thin` with sticky header; mobile-responsive (hides Section column on small screens).
    - Right (lg:col-span-1) "Class-wise Attendance" card: horizontal bar list from `summary.byClass` sorted desc, with colored progress bar (emerald ≥90, amber ≥75, rose <75) and matching rate pill.
  - UHF / RFID Live tab: simulates an EPC Gen2 UHF gate reader at "Main Gate · Reader #VM-UHF-01". Left card shows reader health (frequency, protocol, range, today's reads, uptime %, RSSI dBm, errors), a "System Active" pulsing pill, and a Pause/Resume button. Right card shows a live "Live Tag Reads" table (last 10) where `setInterval` (setTimeout-based jittered 3-5s) pushes random student entries from `api.students.list({status:'Active'})` with IN/OUT direction icon (LogIn/DoorOpen), admission no., class, EPC tag code, and timestamp. Entries animate in. Loading skeletons + empty state handled. Cleanup via clearTimeout on unmount/toggle.
- Created `/src/components/modules/exams.tsx` exporting `ExamsModule`:
  - Top: SectionHeader "Examinations & Results" + 3 StatCards (Total Exams, Completed Exams, Total Marks Entered — computed from `api.exams.list()` with `marksCount` summed).
  - Two-pane `lg:grid-cols-3` layout:
    - Left (lg:col-span-1): scrollable exam cards list (`max-h-[70vh]`), each card showing exam name, type badge, date range (smart "1–5 Oct 2026" formatting when same month), status badge (via StatusBadge), and marks count. Click to select.
    - Right (lg:col-span-2): For the selected exam — gradient header card (name, date range, type, status, marks count) + class selector (Select from `api.academics.classes()`). Tabs:
      1. **Marks Sheet**: pivot table built from `api.exams.marks(examId, classId)` — rows = students (sorted by % desc), columns = subjects, cells show obtained with bg color (green ≥80%, amber ≥60%, rose <40%, muted otherwise). Sticky leftmost Student column + sticky header. Bottom TableFooter row shows subject averages with same color coding. Right columns show Total (obtained/max) and % with color pill. Loading skeleton + empty state handled.
      2. **Progress Card**: student dropdown (derived from marks), then a polished printable report card. School header banner "Vidyamatrix International School — Holistic Progress Card" with gradient + School icon. Student info strip (name, admission no., class, section). Scholastic Area table (subject/max/obtained/%/grade) with colored % pills + total row. Right pane has RadarChart of subject scores (%), plus attendance % (from `api.students.list`) and overall % tiles. Co-scholastic Area grid (Sports & Games / Art & Music / Behavior & Conduct / Life Skills) each with a local-only grade Select (A+/A/B+/B/C/D). Footer with generation date + "Download PDF" button that toasts "Generating PDF…".
      3. **Analysis**: 4-tile summary strip (Total Entries / Subjects / Class Average / Pass Rate) + 2-column grid with BarChart (subject-wise class average %) and PieChart (grade distribution A+/A/B+/B/C/D/F filtered to non-zero counts, emerald/teal/amber/rose/violet/sky/slate palette).
- All tabs reuse the same `api.exams.marks` query (same queryKey) so TanStack Query dedupes — single network request per (exam, class) pair.
- Used `useMemo` for the marks pivot, students-in-exam list, subject averages, and grade distribution to avoid recompute on re-render.
- Effect-free auto-selection of first exam + first class (no set-state-in-effect) — uses `effectiveX = state || (data[0]?.id ?? '')` pattern.
- Dev conventions followed: `'use client'` first line, TanStack Query + `@/lib/api` + `@/lib/types` + shared primitives imports, shadcn `@/components/ui/*` (card, button, badge, skeleton, tabs, table, select), `lucide-react` icons, `sonner` toast, `recharts` charts, emerald/teal accent only (NO indigo/blue), responsive mobile-first with sm/lg breakpoints, tables wrapped in `max-h-[60vh] overflow-y-auto scroll-thin`, `new Date(x).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })` date formatting.
- Fixed a React Compiler ESLint error in attendance.tsx: replaced `useMemo` (whose deps couldn't be inferred due to closure-over `displayStatus`) with an inline IIFE computation, letting the compiler auto-memoize. Removed unused `useMemo` import.
- Removed unused `react-hooks/exhaustive-deps` disable comments (rule is already off in eslint.config.mjs — directives were "unused").
- Fixed 3 TypeScript strict errors in exams.tsx: changed `let r = byStudent.get(...)` pattern to `const existing = ...; const r: PivotRow = existing ?? {...}` so the compiler narrows correctly; defaulted `className: m.className || '-'` in two spots to satisfy `string` (not `string | undefined`) on consumer types.
- Ran ESLint on both files — `0 errors, 0 warnings, exit 0`.
- Ran `bunx tsc --noEmit` — no errors in any of the new/modified files (only pre-existing errors in unrelated files).
- Checked `dev.log` — `✓ Compiled in 176ms` after the new files were added; no runtime errors from the modules.

Stage Summary:
- Both `AttendanceModule` (`/src/components/modules/attendance.tsx`) and `ExamsModule` (`/src/components/modules/exams.tsx`) are production-ready, lint-clean, type-safe, responsive, and follow the emerald/teal accent convention.
- Types: `Exam` extended with optional `marksCount?` and `ExamMark` extended with optional `className?` — both non-breaking, additive, aligned with what the existing API routes already return.
- Attendance module supports both manual marking (with optimistic edits + diff-based save) and a simulated UHF/RFID live gate feed (representing the hardware-integration story in the architecture).
- Exams module delivers a marks pivot, a polished printable holistic progress card (with radar + co-scholastic grades), and exam-level analytics (subject averages + grade distribution).
- All interactive elements have hover states. Loading skeletons via shadcn Skeleton. Empty states via the shared `EmptyState` primitive. No `indigo`/`blue` palette used. Tables wrapped in `max-h-[60vh] overflow-y-auto scroll-thin` containers with sticky headers.
- Files ready to be wired into the ERP shell by the main agent (sidebar already lists `attendance` and `exams` module IDs).

---
Task ID: 12
Agent: ui-modules
Task: Build Library + HR + Communication + Assets module UI files

Work Log:
- Read worklog.md and reviewed existing conventions (dashboard, admissions, academics, attendance, exams modules; primitives; types.ts; api.ts; sidebar; relevant API routes for library, hr, communication, assets, ai/compose).
- Created `/src/components/modules/library.tsx` exporting `LibraryModule` (370 lines):
  - Top: SectionHeader "Library Management" + 4 StatCards (Total Books = sum of totalCopies, Available Now = sum of available, Issued = count where status=Issued, Overdue/Fined = count of overdue + with-fine).
  - Tabs: Catalog / Issued Books.
  - Catalog tab: debounced search input (350ms via setTimeout closure on the handler — no set-state-in-effect) calling `api.library.books(q)`. Table: Accession No, Title+Author+Publisher, Category badge, Available/Total with color coding (rose when 0, amber when ≤1, emerald otherwise), Rack, Price (INR), Issue button. Issue button opens a dialog with a searchable student picker sourced from `api.students.list()` (shows name, admission no, class, section, status badge). Selecting a student + clicking Issue calls `api.library.issue({bookId, studentId})` → toasts success → invalidates both books and issues queries.
  - Issued Books tab: table of all issues — Book (title + accession no), Student (name + admission no), Issue Date, Due Date (with Overdue badge), Status (StatusBadge), Fine (rose if > 0), Action (Return button for Issued status). Overdue rows (status=Issued && dueDate < now) tinted with `bg-rose-500/5`. Return button calls `api.library.return(id)` → toasts success with fine info if applicable.
- Created `/src/components/modules/hr.tsx` exporting `HrModule` (448 lines):
  - Top: SectionHeader "HR & Payroll" + 4 StatCards (Total Employees = count + active count sub, On Leave Today = count of PrincipalApproved leaves spanning today, Pending Leaves = count where status=Pending, Monthly Payroll = sum of netPay for current month, formatted with fmtINRShort).
  - Tabs: Employees / Leave Requests / Payroll.
  - Employees tab: searchable table (Emp Code, Name with initials avatar, Designation, Department, Phone, Joining Date, Salary, Status) + Department Select filter. Row click opens a detail dialog showing avatar, designation, department, status, gender, DOB, salary, email, phone, address.
  - Leave Requests tab: searchable + status-filterable table (Employee with emp code, Designation, Leave Type, Duration with day count, Reason, Status, Actions). Pending rows show three action buttons: HOD Approve (ShieldCheck icon, outline), Principal Approve (Crown icon, default), Reject (Ban icon, rose-tinted). All call `api.hr.approveLeave(id, status)` → toast + invalidate.
  - Payroll tab: `<input type="month">` selector (defaults to current YYYY-MM), "Run Payroll" button calling `api.hr.runPayroll(month)` → toast "{created} payslips created (of {total} active employees)". Table: Emp Code, Employee, Basic, Allowances (+green), Deductions (−rose), Net Pay (bold), Status, Action (Mark Paid button for Processed status that toasts "Payslip generated"). Sticky TableFooter shows totals row with sums for basic/allowances/deductions/net.
- Created `/src/components/modules/communication.tsx` exporting `CommunicationModule` (324 lines):
  - Top: SectionHeader "Communication Center" + 4 StatCards (SMS Sent, Email Sent, WhatsApp, Failed — computed by filtering `api.communication.list()` by channel+status=Sent or status=Failed).
  - Two-column layout `lg:grid-cols-3`:
    - Left (lg:col-span-1): "Compose Message" card (sticky on lg). Channel selector as 4-button grid (SMS/Email/WhatsApp/Push) with per-channel accent icons (emerald/sky/teal/violet). Recipient input (placeholder changes by channel — phone vs email). Subject input only shown when channel=Email. **AI Compose panel** — prominent, with `border-primary/30` + gradient background + Sparkles icon, contains Topic input + Audience input + "AI Compose Message" button calling `api.ai.composeMessage({channel, topic, audience})`. On success: fills message textarea (and subject for email), toasts "AI draft ready". Shows loading state with RefreshCw spinning icon. Message textarea with live char count. Category Select (Attendance/Fees/Exam/Transport/General). Send button calls `api.communication.send` → toasts "Message sent via {channel}" with recipient, then clears the form.
    - Right (lg:col-span-2): "Message History" card with channel filter Select + search input. Table: Channel (icon + label, color-coded), Recipient + Subject (if any) + Message (truncated), Category badge, Status (StatusBadge), Time. Filterable by channel and searchable.
- Created `/src/components/modules/assets.tsx` exporting `AssetsModule` (284 lines):
  - Top: SectionHeader "Assets & Inventory" + 4 StatCards (Total Assets + categories count, Total Value via fmtINRShort, In Good Condition + % of total, Needs Repair = Damaged + Under Repair).
  - Asset Value by Category: BarChart (recharts) with multi-color Cells using emerald/teal/amber/rose/violet/sky/lime/pink palette (no indigo/blue). Y-axis formatted with fmtINRShort. Tooltip shows full INR.
  - Asset Register: Card with category Select, condition Select (All/Good/Damaged/Under Repair), search input, and a "Group" toggle button. Flat view: table (Asset Code, Name, Category, Location, Purchase Value, Condition, Assigned To) with sticky header, sticky footer showing total count + total value, rose tint for Damaged rows, amber tint for Under Repair, click-to-toast asset info. Grouped view: divide-y sections per category, each with sticky sub-header showing category badge + count + subtotal, then a card grid (sm:2 / lg:3 cols) of asset cards with name, code, condition badge, location, value, assigned-to.
- All 4 files start with `'use client'`, use `useQuery`/`useMutation`/`useQueryClient` from `@tanstack/react-query`, import `api` from `@/lib/api`, types from `@/lib/types`, shared primitives from `@/components/erp/primitives`, shadcn `@/components/ui/*` components, `lucide-react` icons, `sonner` toast, and `recharts` charts. Tables wrapped in `max-h-[60vh] overflow-y-auto scroll-thin` containers with sticky headers. Date formatting via `new Date(x).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })`. INR via `Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits: 0 })`.
- No `indigo`/`blue` palette used anywhere. All interactive elements have hover states. Loading skeletons via shadcn Skeleton. Empty states via the shared `EmptyState` primitive.
- Lint cleanup: removed unused `Label` import and unused `fmtDate` helper from assets.tsx; moved `Cell` recharts import to the top imports block (had been at file bottom initially); simplified assets footer to single `colSpan={7}` cell with inner flex layout for cross-breakpoint consistency.
- Effect-free state management: no `useEffect` used anywhere. Library search uses setTimeout closure attached to the handler function for debouncing. No `react-hooks/set-state-in-effect` violations.
- Ran ESLint on all 4 files: `bun node_modules/eslint/bin/eslint.js src/components/modules/library.tsx src/components/modules/hr.tsx src/components/modules/communication.tsx src/components/modules/assets.tsx` → `0 errors, 0 warnings, exit 0`.
- Ran `bunx tsc --noEmit` → no errors in any of the 4 new files (only pre-existing errors in unrelated files: hr/payroll route, mini-services, skills).
- Checked `dev.log` — `✓ Compiled in 150ms` after the new files were added; no runtime errors from the modules.

Stage Summary:
- All 4 module files (`library.tsx`, `hr.tsx`, `communication.tsx`, `assets.tsx`) are production-ready, lint-clean, type-safe, responsive (mobile-first with sm/md/lg/xl breakpoints), and follow the emerald/teal accent convention.
- Library: catalog with debounced server-side search + student-picker issue dialog, issued books table with overdue rose tinting and return action.
- HR: employees directory with detail dialog, leave requests with HOD/Principal/Reject workflow, payroll with month selector + run payroll + totals footer + mark paid action.
- Communication: 4-channel composer (SMS/Email/WhatsApp/Push) with a prominent AI Compose feature (highlighted panel calling `/api/ai/compose`) + filterable message history.
- Assets: bar chart of value by category + filterable asset register with a Group toggle (flat table with totals footer vs grouped card view with per-category subtotals) + row tints for damaged/under-repair.
- Files ready to be wired into the ERP shell by the main agent (sidebar already lists `library`, `hr`, `communication`, `assets` module IDs).
- Lint status: 4 files, 0 errors, 0 warnings, exit 0.

---
Task ID: 4,5,9,11,13,14
Agent: main
Task: Build Dashboard, Students, Fees, Transport, Timetable, AI-Assistant modules + wire page.tsx + verify with agent browser

Work Log:
- Built Dashboard/MIS module: AI insights banner, 8 KPI cards, attendance trend (area chart), fee collection (bar chart), gender ratio (pie), class distribution, recent activity feed, quick actions
- Built Students module: searchable/filterable table, profile drawer with personal/parent/transport/medical info, performance radar chart, fee history, 21-day attendance heatmap, ID card/bonafide actions, Add Student dialog
- Built Fees module: 4 KPI cards, collection overview + payment methods charts, Invoices/Defaulters/Structures/Accounting tabs, payment collection dialog (Cash/Card/Online/UPI), Tally/accounting export panel, ledger summary
- Built Transport module: live GPS map (custom SVG with Bangalore bounds), 6 vehicles tracked via socket.io mini-service (port 3003) with polling fallback, fleet status list, vehicle detail panel, route stops table
- Built Timetable module: weekly grid (Mon-Sat x 8 periods) with color-coded subjects, class/section selectors, subject legend
- Built AI Assistant module: full-page chat with live ERP context, AI-generated insights sidebar, suggestion prompts, capabilities panel
- Wired ErpLayout (sidebar + topbar + module router via Zustand) into page.tsx
- Fixed seed: normalized attendance dates to midnight (was causing 0 results due to time-component mismatch)
- Restarted dev server + transport tracker after DB reset to refresh PrismaClient singleton
- Verified ALL 14 modules render via agent-browser with 0 console errors

Stage Summary:
- Complete ERP with 14 interconnected modules, all functional with real seeded data (456 students, 35 employees, 11856 attendance records, 2736 fee invoices, 6 live GPS buses, library, HR, payroll, assets).
- AI features (chat + insights + message compose) working via z-ai-web-dev-sdk.
- Live transport GPS tracking via socket.io mini-service on port 3003.
- Full ESLint passes (0 errors). Dev log clean (all 200s).
- Agent-browser verified: dashboard real data, student profile drawer, AI chat with live data, transport live map with moving buses, all module tabs render.

---
Task ID: 9
Agent: rbac-ui-guards
Task: Add module-level RBAC permission guards to 5 existing ERP module UI files

Work Log:
- Read worklog.md (architecture, conventions, prior agents' work) and the RBAC source of truth: `src/lib/rbac.ts` (PERMISSIONS matrix, AuthUser, can()) and `src/lib/store.ts` (useCan() hook returning `(module, action) => boolean`; useStore() exposing `user`).
- Verified backend already enforces permissions on all relevant routes (attendance/summary role-scopes to own/children/teacher-classes; exams/marks role-scopes to own/children/teacher-classes; students/list scoped; library/issues scoped). UI guards are purely additive (hide actions for restricted roles, never alter API calls or break admin/teacher flows).
- Files modified (5):

1. `src/components/modules/attendance.tsx` — added `useCan`, `useStore`, `AuthUser`, `AttendanceRecord` imports; added `CalendarDays` to icon imports.
   - New `MyAttendancePanel` component (read-only, ~210 lines): shown when `!can('attendance','mark')` (i.e., students/parents).
     - Resolves linked student ids from `user.studentId` (student) or `user.childrenStudentIds` (parent).
     - For parents with multiple children: fetches visible students via `api.students.list()` (backend-scoped to children) and renders a child selector dropdown.
     - Fetches attendance records via `api.students.attendance(activeStudentId)`.
     - Computes last-30-day attendance rate from records (Present / Marked) and renders a big colored rate number (emerald ≥90, amber ≥75, rose <75) with a "Present / Marked" tile.
     - Renders a 30-day calendar grid (`grid-cols-7 sm:grid-cols-10`, color-coded cells: emerald=Present, rose=Absent, amber=Late, sky=Leave, violet=HalfDay, muted=not marked) with date number and tooltip.
     - Renders a "Recent Statuses" card listing the last 10 entries with status dot, date, and method.
     - Handles edge case: no linked student → EmptyState "No linked student".
   - Main `AttendanceModule`: reads `canMark = useCan()('attendance','mark')` and `user = useStore((s) => s.user)`.
     - Tabs `defaultValue` is now `canMark ? 'mark' : 'mine'`.
     - TabsList conditionally renders either `<TabsTrigger value="mark">Mark Attendance</TabsTrigger>` (staff) OR `<TabsTrigger value="mine">My Attendance / My Children</TabsTrigger>` (students/parents). UHF/RFID tab stays visible to all (additive).
     - TabsContent for "mark" (with MarkAttendancePanel + ClassWiseAttendance) only renders when `canMark`; otherwise TabsContent for "mine" renders MyAttendancePanel.
     - Existing 5 StatCards (Attendance Rate, Present Today, Absent Today, Late Today, On Leave) stay visible to all (backend already role-scopes the summary).
     - Existing teacher/admin mark-attendance flow is untouched.

2. `src/components/modules/exams.tsx` — added `useCan`, `useStore` imports.
   - Main `ExamsModule`: reads `canEnter = useCan()('exams','enter')` and `isStudentOrParent`.
     - `effectiveClassId` is `''` for students/parents (backend scopes marks to their own/children's anyway), or `classId || classes[0]?.id` for staff.
     - Class selector in exam header is hidden for students/parents (replaced with italic note "Scoped to your record" / "Scoped to your children").
     - When `canEnter`, shows a small emerald "Can enter marks" badge next to the class selector.
     - Exam list, Progress Card, Analysis tabs all stay visible to all (read-only).
   - `MarksSheetTab`: added `useStore` to read `user`. For parents: derives `childrenWithMarks` from `user.childrenStudentIds` ∩ marks, renders a child selector dropdown at the top of the card header (only when >1 child has marks), and filters marks client-side to the selected child.
     - Added defensive comment: "any future marks-entry input / cell-editing UI MUST be wrapped in `useCan()('exams','enter')` so only teachers/admins can edit. The sheet below is read-only display — students/parents see only their own / children's marks (the backend enforces scoping)." No marks-entry input existed, so nothing to wrap; the guard is documented for future maintainers.
     - The `useMemo` (subjects/rows/subjectAverages) now consumes the (potentially filtered-for-parent) `marks` array — re-computes correctly when the selected child changes.

3. `src/components/modules/hr.tsx` — added `useCan` import; added `ShieldAlert` icon.
   - Main `HrModule`: defensive `canView = useCan()('hr','view')` guard. All three useQuery hooks (employees, leaves, payroll) now pass `enabled: canView` so they don't fire when the user can't access HR. If `!canView`, renders `<EmptyState icon={ShieldAlert} title="Access Denied" description="You do not have permission to view the HR & Payroll module. Please contact an administrator if you believe this is an error." />` instead of loading data. (Handles the edge case where a user navigates directly to /hr.)
   - `LeavesTab`: `canApprove = useCan()('hr','approve')`. Pending rows now show either the HOD/Principal/Reject buttons (when `canApprove`) OR an italic "View only" text. Resolved rows still show "Resolved".
   - `PayrollTab`: `canRun = useCan()('hr','run')`. The "Run Payroll" button is wrapped in `{canRun && ...}`. The month selector, payroll table, totals footer, and Mark Paid action stay visible.

4. `src/components/modules/library.tsx` — added `useCan` import.
   - `CatalogTab`: `canIssue = useCan()('library','issue')`. Per-book action cell:
     - When `canIssue`: existing "Issue" / "Unavailable" button (admin/teacher).
     - When `!canIssue` and `out`: "Unavailable" text (rose).
     - When `!canIssue` and available: "Available" text (emerald).
     - The `<IssueBookDialog>` is only mounted when `canIssue` (defensive — prevents the dialog from being opened even if state got into a bad state).
   - `IssuedTab`: `canReturn = useCan()('library','return')`. Per-issue action cell:
     - When status=Issued AND `canReturn`: existing "Return" button.
     - When status=Issued AND `!canReturn`: italic "Issued" text (read-only).
     - When status≠Issued: return date or "—" (unchanged).
     - Backend already scopes the issues list to the user's own/children's issues for students/parents.

5. `src/components/modules/communication.tsx` — added `useCan` import.
   - `ComposeCard`: `canSend = useCan()('communication','send')`. The "Send {channel}" button is wrapped in `{canSend ? <Button>...</Button> : <notice>}`.
     - When `!canSend`: replaces the Send button with an amber-tinted notice card: "Sending is restricted to staff. You can still draft messages and use AI Compose."
     - AI Compose panel, channel selector, recipient/subject/message inputs, and Category select all stay visible to all (per spec — AI just drafts, doesn't send).
   - Message History card unchanged — all roles can view (backend scopes appropriately).

- Conventions followed: `'use client'` first line preserved; `useCan`/`useStore` imported from `@/lib/store`; existing shadcn components + shared `EmptyState` primitive reused; no API calls or backend changes; emerald/teal accent only (NO indigo/blue); responsive (mobile-first with sm/md/lg/xl breakpoints); all guards are additive (hide for restricted roles, keep for admin).
- ESLint: `bun node_modules/eslint/bin/eslint.js src/components/modules/attendance.tsx src/components/modules/exams.tsx src/components/modules/hr.tsx src/components/modules/library.tsx src/components/modules/communication.tsx` → exit 0, 0 errors, 0 warnings.
- TypeScript: `bunx tsc --noEmit` → no errors in any of the 5 modified files (only pre-existing errors in unrelated files: examples/websocket, mini-services/transport-tracker, skills/*, src/app/api/hr/payroll/route, src/components/erp/sidebar, src/components/modules/students).
- Dev log: `✓ Compiled in 307ms` etc. — no compile errors after edits; transport tracker still streaming 200s.

Stage Summary:
- 5 module files now enforce RBAC at the UI layer in addition to the existing backend enforcement:
  - **Attendance**: students/parents get a read-only "My Attendance" / "My Children's Attendance" panel (rate + 30-day calendar grid + recent statuses) with child selector for parents; teachers/admins keep the existing Mark Attendance + UHF/RFID Live tabs.
  - **Exams**: class selector hidden for students/parents (backend scopes marks); parent child selector added to Marks Sheet; can-enter-marks badge shown for staff; Progress Card and Analysis tabs visible to all.
  - **HR**: defensive Access-Denied EmptyState when `!can('hr','view')` (handles direct navigation); Approve buttons (HOD/Principal/Reject) hidden unless `can('hr','approve')`; Run Payroll button hidden unless `can('hr','run')`.
  - **Library**: Issue button hidden unless `can('library','issue')` (replaced with Available/Unavailable text); Return button hidden unless `can('library','return')` (replaced with "Issued" text).
  - **Communication**: Send Message button hidden unless `can('communication','send')` (replaced with amber notice that AI Compose is still available); AI Compose, draft inputs, and Message History visible to all.
- All guards are additive: admin/super_admin/teacher retain 100% of existing functionality. Students/parents see appropriate read-only views with their scoped data.
- Lint status: 5 files, 0 errors, 0 warnings, exit 0.

---
Task ID: RBAC-1..10
Agent: main + subagent (task 9)
Task: Implement robust Role-Based Access Control (RBAC) system with Admin, Teacher, Student, Parent roles + granular per-module permissions

Work Log:
- Extended Prisma schema: User (role, passwordHash, employeeId, studentId), TeacherClass junction, ParentChild junction; seeded 5 role accounts (super_admin, admin, teacher, student, parent) with scrypt-hashed passwords
- Built RBAC engine (src/lib/rbac.ts): permission matrix mapping Role × Module × Action[]; can()/accessibleModules()/actionsFor()/visibleStudentIds() helpers
- Built auth (src/lib/password.ts scrypt hashing; src/lib/auth.ts HMAC-signed session cookie + getCurrentUser() + requirePerm() guard)
- Auth API: /api/auth/login (sets httpOnly cookie), /logout, /me
- Client auth store (Zustand): user, authLoading, useCan()/useAccessibleModules() hooks
- LoginOverlay: branded split-screen with 5 demo-account quick-login buttons
- Sidebar filters modules by accessibleModules(role); Topbar shows role badge + Switch User dropdown; ErpLayout gates on auth (loading → login → app) with module-access guard
- Role-specific dashboards: StudentDashboard (own attendance/fees/marks/radar), ParentDashboard (child selector + per-child cards), TeacherDashboard (my classes + quick actions), AdminDashboard (full MIS)
- Backend enforcement on all key APIs: students/fees/exams/attendance scoped by role (student=own, parent=children, teacher=assigned classes); HR/assets/admissions/communication protected by requirePerm(); AI chat builds role-appropriate context (student/parent get personal data only, not institution-wide)
- Module-level UI guards: Students hides Add button; Fees shows Pay (student/parent) vs Collect (admin) + hides Defaulters/Accounting tabs; Attendance shows read-only "My Attendance" for students/parents; Exams hides marks entry; HR defensive guard; Library hides Issue/Return; Communication hides Send
- Fixed seed: attendance dates normalized to midnight for reliable date matching
- Verified via agent-browser: all 5 roles login, scoped dashboards render, sidebar filtering correct, student sees "My Attendance" + "Pay" buttons, AI gives scoped answers, backend returns 403 for forbidden actions

Stage Summary:
- Complete RBAC: 5 roles, 14 modules × 13 actions permission matrix, data-scoped APIs, role-specific UIs.
- Demo accounts: superadmin/super123, admin/admin123, teacher/teacher123, student/student123, parent/parent123
- ESLint: 0 errors across entire src/. Dev server + transport tracker both healthy.
- Agent-browser verified: student/parent/teacher/admin all render correctly with appropriate access.

---
Task ID: 3
Agent: 3-admin-crud-ui
Task: Add admin CRUD UI (Create/Edit/Delete dialogs + buttons, RBAC-guarded) to 3 existing ERP module files: students.tsx, admissions.tsx, academics.tsx

Work Log:
- Read worklog.md (architecture, RBAC, prior agents' work) + the 3 target module files + their backend routes + `api` helper + `useCan` hook + AlertDialog component.
- Found that the spec's claim "backend CRUD API routes are ALL already built and working" was inaccurate for admissions DELETE — added minimal 3-line `DELETE` handlers to `src/app/api/admissions/enquiries/[id]/route.ts` and `src/app/api/admissions/applications/[id]/route.ts` (both `requirePerm('admissions','delete')` + `db.<entity>.delete`). The students `DELETE` and academics `deleteClass` / `deleteSlot` routes already existed.
- Files modified (5 total — 3 UI per spec + 2 minimal backend route additions):

1. `src/components/modules/students.tsx` — added `AlertDialog*` imports, `Pencil` + `Trash2` icons, `ClassInfo` type.
   - `StudentProfileDrawer` now reads `canEdit = useCan()('students','edit')` + `canDelete = useCan()('students','delete')`, fetches `classes` (cached via shared `['classes']` queryKey), owns `updateMut` (`api.students.update`) + `deleteMut` (`api.students.remove` — soft-delete to Inactive). Drawer footer restructured: a new top row (only if `canEdit||canDelete`) holds an outline **Edit** button (`Pencil` icon) + a destructive **Delete** button (`Trash2` icon) wrapped in `<AlertDialog>` with the exact spec copy "This will mark {fullName} as Inactive. Continue?" → red "Yes, mark Inactive". Existing ID Card / Bonafide / Collect Fee row kept below.
   - New `EditStudentDialog` + `EditStudentForm` (uses `key={student.id}` to remount per student, no set-state-in-effect). Pre-fills all 15 spec'd fields: firstName, lastName, dob, gender, bloodGroup, phone, email, fatherName, motherName, parentPhone, parentEmail, classId, address, medicalInfo, status. On submit → `api.students.update(id, data)` → toast + invalidate `['students']` + `['student',id]` + close dialog.

2. `src/components/modules/admissions.tsx` — added `AlertDialog*` imports, `Trash2` icon, `useCan` from `@/lib/store`.
   - `EnquiriesTable` + `ApplicationsTable` each: `canDelete = useCan()('admissions','delete')`, state-controlled `deleteTarget`, and a `deleteMut` that calls `DELETE /api/admissions/{enquiries|applications}/{id}` **directly via fetch** (per spec — no api helper exists for delete enquiry/application). On success → toast + invalidate + clear target. Each table's return wrapped in `<>…</>` so a sibling `<AlertDialog>` can render the confirm. Dropdown gains a destructive "Delete Enquiry" / "Delete Application" item (after the note/email section, with separator) — only when `canDelete`. Confirm copy: "This will permanently delete {studentName}'s admission enquiry/application. This action cannot be undone." → red "Yes, delete". Existing status-advance / Approve / Reject items untouched.

3. `src/components/modules/academics.tsx` — added `useMutation`, `useQueryClient`, `useCan`, `toast`, `Button`, `Label`, `Dialog*`, `AlertDialog*`, `Plus`, `Pencil`, `Trash2` imports.
   - `AcademicsModule`: reads `canCreate/canEdit/canDelete = useCan()('academics', …)`. Owns 4 mutations: `createClassMut` (`api.academics.createClass({ name })`), `updateClassMut` (`api.academics.updateClass(id, { name })`), `deleteClassMut` (`api.academics.deleteClass(id)`), `deleteSlotMut` (`api.academics.deleteSlot(id)`). Each invalidates `['academics','classes']` (or `['academics','timetable']` for slot) + toast + close dialog. Added state: `addClassOpen`, `editClassOpen`, `deleteClassOpen`, `deleteSlotTarget`.
     - Left pane classes-list header now has an "Add" button (outline, `Plus`) next to the count badge — when `canCreate`. Opens `AddClassDialog` (single `name` field).
     - Right pane class summary card header now has **Rename** (outline, `Pencil`) and **Delete** (destructive, `Trash2`) buttons after the stats — when `canEdit`/`canDelete`. Rename opens `EditClassDialog` (pre-filled, `key={cls.id}`). Delete opens `<AlertDialog>` "permanently delete {name} along with its sections, subjects and timetable slots" → `deleteClassMut` + clears `selectedId`.
     - `SectionsSubjectsTab` now takes `canEdit` prop. When `canEdit`, "Add Section" + "Add Subject" buttons appear next to their respective headings. The tab owns its own `addSectionMut` (`api.academics.addSection(classId, data)`) + `addSubjectMut` (`api.academics.addSubject(classId, data)`).
     - `TimetableGrid` now takes `canDelete` + `onSlotClick` props. When `canDelete`, every filled slot cell becomes a `<button>` with `cursor-pointer` + rose-tinted hover border + tiny "click to delete" hint. Click → `setDeleteSlotTarget(slot)` → `<AlertDialog>` showing slot's subject + day + period + time + teacher → red "Delete this slot" → `deleteSlotMut`.
   - New components: `AddClassDialog`, `EditClassDialog` + `EditClassForm` (key-remount pattern), `AddSectionDialog` (name, capacity, teacherId), `AddSubjectDialog` (name, code, teacherId). Section/Subject cards fall back to `teacherId` if `teacherName` missing (the GET classes route currently returns teacherId only).
   - `teacherId` field on Add Section/Add Subject is a free-text input (Prisma schema has `teacherId String?` with no FK constraint, so any string works; empty → backend stores null). Avoided depending on `api.hr.employees()` since that route has no GET handler (pre-existing HR module issue, unrelated to this task).

4. `src/app/api/admissions/enquiries/[id]/route.ts` — added 7-line `DELETE` handler: `requirePerm('admissions','delete')` + `db.admissionEnquiry.delete({ where: { id } })` → `{ ok: true, id }`.

5. `src/app/api/admissions/applications/[id]/route.ts` — added 7-line `DELETE` handler: `requirePerm('admissions','delete')` + `db.application.delete({ where: { id } })` → `{ ok: true, id }`.

- Conventions followed: `'use client'` first line preserved on all 3 module files; mutations use `useMutation` + `qc.invalidateQueries` + `toast.success`/`toast.error` from sonner; every create/edit/delete button wrapped in `useCan()('module','action')` (admin & super_admin only); emerald/teal accent preserved, destructive actions use rose-600 AlertDialogAction with `hover:bg-rose-700`; NO indigo/blue; responsive (mobile-first, `size="sm"` + `h-8` compact buttons, class-header actions wrap on small screens); existing functionality untouched — only additive CRUD UI; AlertDialog used for all delete confirmations per spec; no `useEffect` (form state via `useState` initializer + `key={entity.id}` remount pattern to avoid `react-hooks/set-state-in-effect` violations).
- ESLint: `bun node_modules/eslint/bin/eslint.js src/components/modules/students.tsx src/components/modules/admissions.tsx src/components/modules/academics.tsx` → **exit 0, 0 errors, 0 warnings**. Also ran on the 2 modified route files → exit 0.
- TypeScript: `bunx tsc --noEmit` → only **pre-existing** error in `students.tsx:294` (`<Info label="Gender" value={student?.gender} />` — `student?.gender` is `string | undefined` while `Info.value` expects `string`). Verified via `git stash` that this error exists on the unmodified file (was at line 258 before my 36-line insertion). admissions.tsx + academics.tsx have ZERO TS errors. Not introduced by this task.
- Dev log: `✓ Compiled in 141ms / 192ms / 216ms / 386ms` after each save — no compile errors. Pre-existing `GET /api/hr/employees 405` is unrelated.

Stage Summary:
- 3 ERP module files now have full admin CRUD UI, all RBAC-guarded client-side (`useCan`) AND server-side (`requirePerm`):
  - **Students**: Edit (15-field dialog pre-filled from student) + Delete (AlertDialog → soft-delete to Inactive) from the profile drawer footer.
  - **Admissions**: Delete Enquiry + Delete Application (AlertDialog confirm, fetch-based DELETE) in the actions dropdowns.
  - **Academics**: Add Class (dialog), Rename Class (dialog), Delete Class (AlertDialog), Add Section (dialog), Add Subject (dialog), Delete Timetable Slot (clickable cell → AlertDialog).
- Plus 2 minimal backend `DELETE` handlers added to admissions routes (7 lines each) to make the Delete UI functional end-to-end.
- Lint status: 3 module files + 2 route files, 0 errors, 0 warnings, exit 0.
- All admin/super_admin actions now have proper UI; teachers/students/parents see no create/edit/delete buttons (useCan returns false for them on these actions).

---
Task ID: 4
Agent: 4-admin-crud-ui
Task: Add admin CRUD UI (Create/Edit/Delete dialogs + buttons, RBAC-guarded) to 3 existing ERP module files: fees.tsx, exams.tsx, timetable.tsx

Work Log:
- Read worklog.md (architecture, RBAC, prior agents' work — esp. Task 3 which set the pattern for Students/Admissions/Academics CRUD UI) + the 3 target module files + their backend routes (`/api/fees/structures`, `/api/fees/invoices/create`, `/api/exams`, `/api/exams/marks/enter`, `/api/academics/timetable`) + the `api` helper + `useCan` hook + AlertDialog + Select components.
- Confirmed the spec's claim this time: every CRUD endpoint called (`fees.createStructure/updateStructure/deleteStructure`, `fees.createInvoice/deleteInvoice`, `exams.create/update/remove`, `exams.enterMarks`, `academics.addSlot/deleteSlot`) already exists and is `requirePerm`-guarded server-side. **No backend changes needed.**
- Files modified (3 UI files, additive only):

1. `src/components/modules/fees.tsx` — added `useMutation`, `useQueryClient`, `AlertDialog*`, `Pencil`+`Trash2`+`Plus`, types `FeeStructure`/`Student`/`ClassInfo`.
   - `FeesModule` reads `canEdit` + `canDelete` (new) in addition to existing `canCreate`/`canCollect`/`canPay`. Owns 5 mutations: `createStructMut`, `updateStructMut`, `deleteStructMut` (all → invalidate `['fee-structures']`), `createInvMut`, `deleteInvMut` (both → invalidate `['invoices']` + `['fee-summary']`). Each toasts success/error.
   - Added 2 supporting useQuery hooks (shared queryKeys): `['classes']` (for the structure class picker) and `['students','list','fees-crud']` (for the invoice student picker).
   - **Add Structure** button (already `canCreate`-guarded) now opens a real `FeeStructureDialog` (name, classId select from `api.academics.classes()`, amount, frequency select [Annual/Term/Monthly/OneTime], dueDate). Same dialog handles edit mode (pre-filled from clicked row).
   - Fee Structure table gains an "Actions" column (only when `canEdit||canDelete`): `Pencil` (edit, when `canEdit`) + `Trash2` (delete, when `canDelete`, rose) icon buttons per row. Delete opens `<AlertDialog>` "Delete fee structure? … name / class / frequency / amount … existing invoices will not be affected" → red `AlertDialogAction` "Yes, delete" → `deleteStructMut`.
   - Invoices tab header gains a "Create Invoice" button (when `canCreate`) → opens `CreateInvoiceDialog` with a searchable student picker (filter by name/admission no/class — Select shows first 100 matches) + fee structure picker (shows name/class/amount/frequency) + live preview card. On submit → `api.fees.createInvoice({studentId, feeStructureId})`.
   - Each invoice row gains a `Trash2` icon button next to the existing Collect/Receipt button (when `canDelete`) → `<AlertDialog>` "Delete invoice? … invoiceNo / studentName / amount / status" → red action → `deleteInvMut`.
   - All 5 dialogs/alert-dialogs conditionally rendered at the bottom of `FeesModule` via `{state && <Component/>}` so they mount fresh each time (initial state derived from `target` — no set-state-in-effect issues).
   - Existing KPI cards, charts, Invoices/Defaulters/Structures/Accounting tabs, PaymentDialog, accounting export panel — untouched.

2. `src/components/modules/exams.tsx` — added `useMutation`, `useQueryClient`, `Dialog*`, `AlertDialog*`, `Input`, `Label`, `Plus`, `Pencil`, `Trash2`.
   - `ExamsModule` reads `canCreate`/`canEdit`/`canDelete` (new) in addition to existing `canEnter`. Owns 3 mutations: `createExamMut`, `updateExamMut`, `deleteExamMut` (all → invalidate `['exams','list']`). Delete also clears `selectedId` if the deleted exam was selected.
   - **New Exam** button (`Plus` icon) at the top of the exam-list pane header (when `canCreate`) → `ExamDialog` (name, examType select [Unit Test/Mid Term/Final/Online], startDate, endDate with `endDate ≥ startDate` validation).
   - `ExamListItem` now accepts `canEdit`/`canDelete`/`onEdit`/`onDelete` props and renders an Edit (`Pencil`) + Delete (`Trash2`, rose) footer row (only when `canEdit||canDelete`). Footer uses `onClick={(e) => e.stopPropagation()}` so the click doesn't bubble to the card-select handler. Card wrapper changed from `<button>` to `<div cursor-pointer>` to avoid nesting buttons inside buttons (invalid HTML) — keyboard/click behaviour preserved.
   - Delete Exam opens `<AlertDialog>` "Delete exam? … name / type / date range … all marks entered will be lost" → red action → `deleteExamMut`.
   - **Enter Marks (Edit Mode)**: `MarksSheetTab` accepts new `canEnter` prop. When `canEnter`, an **Edit Mode** toggle button (outline→default when active, label "Done Editing") appears in the card header. When on, every marks cell renders a new `EditableMarkCell` (small inline `<input type="number">`) instead of the static span. On blur or Enter → `enterMarksMut.mutate({ examId, studentId, subject, maxMarks, obtained })` → invalidates `['exams','marks', examId, classId]` + `['exams','list']` + toast `Marks saved · {subject}: {obtained}/{maxMarks}`. `EditableMarkCell` uses `key={\`${studentId}-${subject}-${obtained ?? 'null'}\`}` so it remounts with the new server value after a save (no set-state-in-effect). Empty cells also render inputs in edit mode (using the subject's known maxMarks from the column header). When edit mode off / `!canEnter`, original read-only spans render with their color coding. A small hint banner shows when edit mode is on: "Click any marks cell to edit. Press Enter or click away to save."
   - Existing stat cards, exam list, Progress Card tab, Analysis tab, parent child selector — untouched.

3. `src/components/modules/timetable.tsx` — added `useMutation`, `useQueryClient`, `useCan`, `Dialog*`, `AlertDialog*`, `Input`, `Label`, `Plus`, `Trash2`, `cn`, `TimetableSlot` type.
   - `TimetableModule` reads `canCreate`/`canDelete` (new). Owns 2 mutations: `addSlotMut` (`api.academics.addSlot`), `deleteSlotMut` (`api.academics.deleteSlot`) — both invalidate `['timetable', classId, sectionId]`. Fixed grid typing to `Record<string, Record<number, TimetableSlot[]>>` (was `typeof slots` — worked at runtime but typed loosely).
   - **Add Slot**: "Add Slot" button in `SectionHeader` action area (when `canCreate && classId`). Toggles "Add mode" — button label switches to "Cancel Add" + a banner "Add mode active: click any empty cell (—) in the grid below to open the slot dialog." Empty cells render as `<button>` with `hover:bg-primary/10` (always clickable for admins, regardless of add mode — add mode just provides a visual hint). Click → `AddSlotDialog` pre-fills Day + Period (read-only) + Start/End Time (initialized from the PERIODS table); user enters subjectName, teacherName, room, optional section (Select shown only when current view is "All Sections"). On submit → `addSlotMut.mutate({ classId, sectionId?, day, period, subjectName, teacherName, room, startTime, endTime })`. Section picker uses `"__all__"` sentinel value because Radix Select doesn't support empty-string item values.
   - **Delete Slot**: filled cells render as `<button>` (when `canDelete`) with `hover:ring-2 hover:ring-rose-400/50` to indicate clickability. Click → `<AlertDialog>` showing full slot details (Day · Period, Time, Subject, Teacher, Room, Class/Section) in a styled summary card + "Delete this slot? This action cannot be undone." → red `AlertDialogAction` "Delete slot" (Trash2 icon) → `deleteSlotMut`. AlertDialogDescription uses `asChild` with a `<div>` wrapper to keep HTML valid (no `<div>` inside default `<p>`).
   - Existing weekly grid, class/section selectors, subject color coding, subject legend, Export PDF button (now shares the action row with Add Slot) — untouched.

- Conventions followed: `'use client'` first line preserved; mutations use `useMutation` + `qc.invalidateQueries` + `toast.success`/`toast.error` from sonner; every create/edit/delete button wrapped in `useCan()('module','action')` (admin & super_admin only); emerald/teal accent preserved; destructive actions use rose-600 AlertDialogAction with `hover:bg-rose-700 text-white`; NO indigo/blue; responsive (mobile-first, `size="sm"` + `h-7`/`h-8` compact buttons, `size-7` icon buttons, dialogs `max-w-md`/`max-w-lg`); existing functionality untouched — only additive CRUD UI; AlertDialog used for all delete confirmations; no `useEffect` (form state via `useState` initializer + conditional rendering + `key` remount pattern to avoid `react-hooks/set-state-in-effect` violations).
- ESLint: `bun node_modules/eslint/bin/eslint.js src/components/modules/fees.tsx src/components/modules/exams.tsx src/components/modules/timetable.tsx` → **exit 0, 0 errors, 0 warnings**.
- Dev log: `✓ Compiled in 543ms / 138ms / 145ms / 130ms / 148ms / 129ms / 124ms / 141ms / 204ms / 192ms / 216ms / 386ms` after saves — no compile errors, no warnings, no exceptions.

Stage Summary:
- 3 ERP module files now have full admin CRUD UI, all RBAC-guarded client-side (`useCan`) AND server-side (`requirePerm` on the existing routes — no backend changes were needed):
  - **Fees**: Create/Edit/Delete Fee Structure (dialog with class picker + frequency select + amount + due date), Create Invoice (searchable student picker + fee structure picker + live preview), Delete Invoice (AlertDialog).
  - **Exams**: Create/Edit/Delete Exam (dialog with type select + date range + validation), inline marks entry via an "Edit Mode" toggle that turns every cell into an input (blur/Enter saves via `api.exams.enterMarks`).
  - **Timetable**: Add Slot (click empty cell → dialog pre-filled with day/period/time, accepts subject/teacher/room/section), Delete Slot (click filled cell → AlertDialog with full slot details).
- All admin/super_admin actions now have proper UI; teachers see only "Edit Mode" for marks (enter permission), students/parents see no create/edit/delete buttons.
- Lint status: 3 files, 0 errors, 0 warnings, exit 0.

---
Task ID: 5
Agent: 5-admin-crud-ui
Task: Add admin CRUD UI (Create/Edit/Delete dialogs + buttons, RBAC-guarded) to 5 existing ERP module files: hr.tsx, library.tsx, assets.tsx, transport.tsx, communication.tsx

Work Log:
- Read worklog.md (architecture, RBAC, prior agents' work — esp. Task 4 which set the pattern for Fees/Exams/Timetable CRUD UI). Inspected the 5 target module files + the `api` helper (`src/lib/api.ts` already had every CRUD method wired: `hr.createEmployee/updateEmployee/deleteEmployee`, `library.createBook/updateBook/deleteBook`, `assets.create/update/remove`, `transport.createVehicle/updateVehicle/deleteVehicle/createStop/deleteStop`, `communication.remove`) + the `useCan` hook + AlertDialog primitives.
- Confirmed spec: every backend route called already exists and is `requirePerm`-guarded server-side. **No backend changes needed.**
- Files modified (5 UI files, additive only):

1. `src/components/modules/hr.tsx` — added `AlertDialog*` imports + `Plus, Pencil, Trash2` icons.
   - `EmployeesTab` now reads `canCreate`/`canEdit`/`canDelete` (new) and owns 3 mutations: `createMut`, `updateMut`, `deleteMut` (all → invalidate `['hr','employees']` + toast success/error).
   - **Add Employee**: "Add Employee" button in the Employees tab header (next to dept select + search box) when `canCreate`. Opens `EmployeeFormDialog` (mode `create`).
   - **Edit Employee**: per-row `Pencil` icon button in a new "Actions" column (only when `canEdit||canDelete`) → opens `EmployeeFormDialog` (mode `edit`, pre-filled from clicked row). Action cell uses `onClick={(ev) => ev.stopPropagation()}` so the click doesn't bubble to the row's `setSelected` (view employee) handler.
   - **Delete Employee**: per-row `Trash2` icon button (rose, when `canDelete`) → `<AlertDialog>` "Delete employee? … name / empCode / designation / department … leave requests & payroll may be affected" → red `AlertDialogAction` "Yes, delete" → `deleteMut`.
   - New `EmployeeFormDialog` component (firstName, lastName, designation, department, gender [Male/Female/Other], phone, email, salary, joiningDate) with required-field validation, key-remount pattern (`key={formDialog.mode === 'edit' ? target?.id : 'create'}`) so edit state resets per row.
   - Existing EmployeeDialog (view-only details), LeavesTab (approve flow), PayrollTab (run payroll), KPI stat cards — untouched.

2. `src/components/modules/library.tsx` — added `AlertDialog*` imports + `Plus, Pencil, Trash2` icons.
   - `CatalogTab` now reads `canCreate`/`canEdit`/`canDelete` (new) and owns 3 mutations: `createMut`, `updateMut`, `deleteMut` (all → invalidate `['library','books']` + toast).
   - **Add Book**: "Add Book" button in the Catalog tab header (next to search box) when `canCreate` → opens `BookFormDialog` (mode `create`).
   - **Edit Book**: per-row `Pencil` icon button in a new "Manage" column (only when `canEdit||canDelete`) → opens `BookFormDialog` (mode `edit`, pre-filled from clicked row).
   - **Delete Book**: per-row `Trash2` icon button (rose, when `canDelete`) → `<AlertDialog>` "Delete book? … title / author / accessionNo … issue history may be affected" → red action → `deleteMut`.
   - New `BookFormDialog` (accessionNo, title, author, isbn, category [10 options: Fiction/Non-Fiction/Textbook/Reference/Science/Mathematics/History/Biography/Children/Other], publisher, price, totalCopies, rack) + `BOOK_CATEGORIES` const.
   - Existing IssueBookDialog (student picker), IssuedTab (return flow), KPI stat cards — untouched.

3. `src/components/modules/assets.tsx` — added `useMutation`, `useQueryClient`, `useCan`, `Label`, `Dialog*`, `AlertDialog*`, `Plus, Pencil, Trash2` imports (file previously had no mutation hooks at all). Added `ASSET_CONDITIONS` const.
   - `AssetsModule` now reads `canCreate`/`canEdit`/`canDelete` (new) and owns 3 mutations: `createMut`, `updateMut`, `deleteMut` (all → invalidate `['assets','list']` + toast).
   - **Add Asset**: "Add Asset" button in the Asset Register header (after the Group button) when `canCreate` → opens `AssetFormDialog` (mode `create`).
   - **Edit Asset**: per-row `Pencil` icon button (in flat table) OR per-card `Pencil` icon button (in grouped view) when `canEdit` → opens `AssetFormDialog` (mode `edit`, pre-filled). Both use `stopPropagation` so the existing `toast.info` row/card click handler doesn't fire.
   - **Delete Asset**: per-row `Trash2` icon button (flat) OR per-card `Trash2` icon button (grouped) when `canDelete` → `<AlertDialog>` "Delete asset? … name / assetCode / category / purchaseValue" → red action → `deleteMut`.
   - `AssetRow` component signature changed from `({ a })` to `({ a, canEdit, canDelete, onEdit, onDelete })` — caller passes everything in.
   - New `AssetFormDialog` (name, category [existing + 6 fallbacks so the dropdown is never empty], location, purchaseValue, condition [Good/Damaged/Under Repair], assignedTo). `TableFooter` `colSpan` now adjusts: 8 when actions column present, else 7.
   - Existing KPI stat cards, asset-value-by-category bar chart, category/condition filters, Group toggle, grouped card layout — untouched.

4. `src/components/modules/transport.tsx` — added `useMutation`, `useCan`, `Input`, `Label`, `Select*`, `Dialog*`, `AlertDialog*`, `Plus, Pencil, Trash2` imports. Added local `Stop` interface + `VEHICLE_TYPES` const.
   - `TransportModule` now reads `canCreate`/`canEdit`/`canDelete` (new) and owns 5 mutations: `createVehicleMut`, `updateVehicleMut`, `deleteVehicleMut` (all → invalidate `['vehicles']`), `createStopMut`, `deleteStopMut` (both → invalidate `['stops']`). Each toasts success/error.
   - Added state: `vehicleDialog`, `vehicleDelete`, `stopDialog`, `stopDelete`. Added `selectedVehicle` lookup (`(vehicles||[]).find(v => v.id === selected?.id)`) to get the full `Vehicle` record (with type/capacity/driverPhone) for the edit dialog prefill + delete confirmation message.
   - **Add Vehicle**: "Add Vehicle" button in the Fleet Status card header (next to title) when `canCreate` → opens `VehicleFormDialog` (mode `create`).
   - **Edit Vehicle**: in the selected-vehicle detail panel's right-side action stack, an "Edit" button (when `canEdit && selectedVehicle`) at the top, before the existing Notify Pickup/Drop/ETA buttons → opens `VehicleFormDialog` (mode `edit`, pre-filled from `selectedVehicle`).
   - **Delete Vehicle**: "Delete" button (rose, when `canDelete && selectedVehicle`) next to the Edit button → `<AlertDialog>` "Delete vehicle? … vehicleNo / type / driverName / routeName" → red action → `deleteVehicleMut` (also clears `selectedId` if the deleted vehicle was selected).
   - **Add Stop**: "Add Stop" button in the Route Stops card header (when `canCreate`) → opens `StopFormDialog`.
   - **Delete Stop**: per-stop-row `Trash2` icon button (rose, when `canDelete`) → `<AlertDialog>` "Delete stop? … name / routeName / pickupTime / dropTime / fare" → red action → `deleteStopMut`.
   - New components: `VehicleFormDialog` (vehicleNo, type [Bus/Mini Bus/Van/Car], capacity, driverName, driverPhone, routeName) + `StopFormDialog` (name, routeName, lat, lng, pickupTime, dropTime, fare). Both use required-field validation + key-remount pattern.
   - Empty-stops state now renders a "No route stops configured." placeholder (was rendering empty list).
   - Existing live GPS map (SVG), vehicle list with status badges, route stops table, stat cards, socket.io connection — untouched.

5. `src/components/modules/communication.tsx` — added `AlertDialog*` imports + `Trash2` icon.
   - `HistoryCard` now reads `canDelete` (new) and owns `deleteMut` (→ invalidate `['communication','list']` + toast).
   - **Delete Notification**: per-row `Trash2` icon button (rose, when `canDelete`) in a new "Delete" column → `<AlertDialog>` "Delete notification? … channel / recipient / subject" → red action → `deleteMut`.
   - Existing ComposeCard (channel selector, recipient/subject inputs, AI Compose panel, message textarea, category select, Send button), KPI stat cards, HistoryCard channel filter + search — untouched.

- Conventions followed: `'use client'` first line preserved on all 5 files; mutations use `useMutation` + `qc.invalidateQueries` + `toast.success`/`toast.error` from sonner; every create/edit/delete button wrapped in `useCan()('module','action')` (admin & super_admin only); emerald/teal accent preserved, destructive actions use rose-600 AlertDialogAction with `hover:bg-rose-700 text-white`; NO indigo/blue; responsive (mobile-first, `size="sm"` + `h-8` compact header buttons, `size-7` icon buttons in tables, `size-6` in dense grouped cards, dialogs `max-w-md`/`max-w-lg`); existing functionality untouched — only additive CRUD UI; AlertDialog used for all delete confirmations per spec; no `useEffect` (form state via `useState` initializer + conditional rendering + `key` remount pattern to avoid `react-hooks/set-state-in-effect` violations).
- ESLint: `bun node_modules/eslint/bin/eslint.js src/components/modules/hr.tsx src/components/modules/library.tsx src/components/modules/assets.tsx src/components/modules/transport.tsx src/components/modules/communication.tsx` → **exit 0, 0 errors, 0 warnings**.
- TypeScript: `bunx tsc --noEmit` → only **pre-existing** errors in OTHER files (hr/payroll route's `employee` relation, students.tsx:294 `student?.gender`, sidebar.tsx ModuleId mismatch, mini-services, skills). **Zero** TS errors introduced by my 5 files.
- Dev log: `GET / 200 in 3.0s (compile: 2.7s, render: 267ms)` after the changes — no compile errors, no exceptions. Pre-existing `POST /api/transport/update 200` socket traffic (mini-service) continues normally.

Stage Summary:
- 5 ERP module files now have full admin CRUD UI, all RBAC-guarded client-side (`useCan`) AND server-side (`requirePerm` on the existing routes — no backend changes were needed):
  - **HR**: Add Employee (9-field dialog), Edit Employee (per-row pencil), Delete Employee (per-row AlertDialog). Invalidates `['hr','employees']`.
  - **Library**: Add Book (9-field dialog with category select), Edit Book (per-row pencil), Delete Book (per-row AlertDialog). Invalidates `['library','books']`.
  - **Assets**: Add Asset (6-field dialog with category + condition selects), Edit Asset (per-row pencil in flat view + per-card pencil in grouped view), Delete Asset (per-row/per-card AlertDialog). Invalidates `['assets','list']`. `AssetRow` now takes `canEdit`/`canDelete`/`onEdit`/`onDelete` props.
  - **Transport**: Add Vehicle (6-field dialog with type select), Edit Vehicle (in selected-vehicle detail panel), Delete Vehicle (in detail panel, AlertDialog), Add Stop (7-field dialog with lat/lng + time + fare), Delete Stop (per-row AlertDialog). Invalidates `['vehicles']` and `['stops']`.
  - **Communication**: Delete Notification (per-row trash icon in HistoryCard, AlertDialog). Invalidates `['communication','list']`.
- All admin/super_admin actions now have proper UI; teachers/students/parents see no create/edit/delete buttons (useCan returns false for them on these actions).
- Lint status: 5 files, 0 errors, 0 warnings, exit 0. TypeScript: 0 new errors introduced. Page compiles in 2.7s, GET / returns 200.

---
Task ID: CRUD-1..6
Agent: main + 3 subagents (tasks 3,4,5)
Task: Enforce user-specific role data isolation + admin full CRUD on every module

Work Log:
- Audited all 22 API routes for auth/permission gaps; protected ALL remaining endpoints:
  - Student detail + sub-routes ([id], [id]/attendance, [id]/fees, [id]/marks) — ownership scoping (student=own, parent=children, teacher=assigned classes, admin=all)
  - Dashboard chart endpoints (attendance-trend, fee-trend, class-distribution, gender-ratio, activity) — staff-only
  - academics/classes, academics/timetable, exams, library/books, transport/stops, fees/summary — view permission + role scoping
  - ai/insights (staff-only), ai/compose (auth), library/issues/[id]/return (return perm + ownership)
- Scoped fees/summary by role: student sees own ₹38.5K collected, admin sees institution ₹2.53 Cr
- Added admin CRUD backend routes for ALL master entities:
  - Students: PATCH (edit) + DELETE (soft-delete → Inactive)
  - Employees: POST (create) + PATCH (edit) + DELETE
  - Classes: POST + PATCH + DELETE; Sections: POST; Subjects: POST
  - Fee Structures: POST + PATCH + DELETE; Fee Invoices: POST (create) + DELETE
  - Exams: POST + PATCH + DELETE; Exam Marks: POST (enter/upsert) + DELETE
  - Timetable Slots: POST + PATCH + DELETE
  - Vehicles: POST + PATCH + DELETE; Transport Stops: POST + PATCH + DELETE
  - Books: POST + PATCH + DELETE
  - Assets: POST + PATCH + DELETE
  - Notifications: DELETE
  - Admissions enquiries/applications: DELETE (added by subagent)
- Updated RBAC matrix: admin now has 'delete' on all modules
- Added all CRUD methods to src/lib/api.ts (create/update/remove for every entity)
- 3 parallel subagents added CRUD UI to all 14 modules:
  - Task 3: Students (edit/delete in drawer), Admissions (delete enquiry/application), Academics (add/rename/delete class, add section/subject, delete timetable slot)
  - Task 4: Fees (create/edit/delete structure, create/delete invoice), Exams (create/edit/delete exam, edit-mode marks entry), Timetable (add/delete slot)
  - Task 5: HR (add/edit/delete employee), Library (add/edit/delete book), Assets (add/edit/delete), Transport (add/edit/delete vehicle + add/delete stop), Communication (delete notification)
- Fixed 4 routes that lost GET handlers when POST was added (fees/structures, transport/vehicles, hr/employees, assets)
- Verified: admin CRUD works end-to-end (created Test Employee, Sports Fee — both persisted); student denied all admin endpoints (403); student sees only own data across all modules

Stage Summary:
- Complete data isolation: every API endpoint checks auth + permission + role-scoped data. Students/parents see ONLY own/children's records. Teachers see ONLY assigned classes. Admin sees all.
- Complete admin CRUD: Create/Edit/Delete UI on ALL 14 modules, all permission-guarded, all functional.
- ESLint: 0 errors. Dev server healthy. Agent-browser verified admin CRUD + student isolation.

---
Task ID: 6
Agent: transport-ui-tabs
Task: Rewrite Transport module UI with tabbed interface (Live Tracking, Drivers, Routes, Student Assignment) — add Driver/Route/Student-assignment management UI on top of existing live GPS tracking.

Work Log:
- Read worklog.md, src/lib/api.ts, src/lib/store.ts, src/lib/rbac.ts, src/lib/types.ts, src/components/erp/primitives.tsx, src/components/ui/tabs.tsx, src/components/ui/table.tsx, all 5 transport API route files (drivers, routes, drivers/[id], routes/[id], stops, stops/[id], assign-student), and the existing src/components/modules/transport.tsx (661 lines, with live GPS map + socket.io + vehicle/stop CRUD).
- Confirmed RBAC: admin/super_admin/transport_manager have full transport CRUD; transport_manager also has students view+edit (for assignment). Teacher has transport.view only; student/parent have transport.view (their own).
- Rewrote `src/components/modules/transport.tsx` (now 1704 lines) keeping `'use client'` first line. Structure:

  **`TransportModule` (top-level):**
  - Hoisted the socket.io connection (`io('/?XTransformPort=3003')`), `liveVehicles` state, `connected` state, and the `vehicles` useQuery (with `refetchInterval: connected ? false : 3000` polling fallback) to the top level so the live GPS keeps streaming across tab switches. Also fetched `stops` here for sharing.
  - Renders a `Tabs` with 4 tabs (Live Tracking / Drivers / Routes / Student Assignment). Passes `vehicles`, `liveVehicles`, `connected`, `stops` down to the relevant sub-components.

  **Tab 1 — `LiveTrackingTab` (existing UI, refactored to receive props):**
  - 4 StatCards (Total Fleet, Moving Now, At Stops, GPS Status) — unchanged.
  - Live Fleet Map card (lg:col-span-2) with the `<LiveMap>` SVG component — unchanged, still uses `project()` + BOUNDS + `VEH_COLORS`.
  - Fleet Status list card with "Add Vehicle" button (RBAC-guarded).
  - Selected-vehicle detail panel (6 Metric tiles + Edit/Delete buttons + Notify Pickup/Drop/Calculate ETA).
  - Route Stops & Pickups card with Add Stop + per-stop Delete (AlertDialog).
  - Existing `VehicleFormDialog` and `StopFormDialog` reused for create/edit + delete confirmations.
  - Socket `connect`/`disconnect`/`vehicles:update` listeners preserved exactly.

  **Tab 2 — `DriversTab` (NEW):**
  - Stat strip: Total Drivers, Assigned (vehicleId != null), Available (free & Active), On Leave (status=OnLeave).
  - Drivers table (`max-h-[60vh] overflow-y-auto scroll-thin`) with columns: Name (+address), Phone, License No, Status (StatusBadge), Assigned Bus, Actions.
  - "Add Driver" button (RBAC create) → `<DriverFormDialog>` (name, phone, licenseNo, address, status-on-edit) → `api.transport.createDriver`.
  - Per-row Edit (pencil) → `<DriverFormDialog mode="edit">` → `api.transport.updateDriver`.
  - Per-row Delete (trash, rose) → AlertDialog (explains soft-delete: status→Inactive + unassign) → `api.transport.deleteDriver`.
  - Per-row **Assign to Bus** Select dropdown listing all vehicles (vehicleNo · routeName) + "— Unassign —" option. Selecting calls `api.transport.assignDriver(id, vehicleId|null)`. Shows current vehicleId as the Select value. Disabled for users without `transport.edit`.
  - All mutations invalidate `['drivers']` + `['vehicles']` (since driver assignment syncs driverName on vehicle) + `toast.success`.

  **Tab 3 — `RoutesTab` (NEW):**
  - Stat strip: Total Routes, Active (status=Active), Total Buses Assigned (sum of vehicles across routes), Total Stops (sum of stopCount).
  - Routes list as cards (lg:grid-cols-2). Each card shows: route name + StatusBadge + description, meta strip (Stops count, Buses count), assigned buses as chips (vehicleNo + driverName), and an Actions row.
  - "Add Route" button (RBAC create) → `<RouteFormDialog>` (name, description, optional vehicleId Select to assign a bus at creation — matches the "create new route and assign bus to that route" requirement) → `api.transport.createRoute`.
  - Per-card Edit (RBAC edit) → `<RouteFormDialog mode="edit">` (name, description, status) → `api.transport.updateRoute`.
  - Per-card Delete (RBAC delete) → AlertDialog (explains buses/stops/students get unlinked) → `api.transport.deleteRoute`. Invalidates routes+vehicles+stops+students.
  - Per-card **Assign Bus to Route** Select — lists all vehicles + "— Unassign all buses —" option. Calls `api.transport.assignBusToRoute(routeId, vehicleId|null)`. Single-select add (per backend semantics: vehicleId assigns that one vehicle; null unassigns ALL).
  - Per-card **Manage Stops** toggle button — expands an inline sub-view listing all stops filtered by `stop.routeName === route.name`. Each stop row has Edit (pencil) → `<StopFormDialog mode="edit">` and Delete (trash) → AlertDialog. "Add Stop" button inside the sub-view opens `<StopFormDialog>` with `defaultRouteName` pre-filled and the routeName field disabled, calling `api.transport.createStop`. Stop edit/delete reuse `api.transport.updateStop`/`api.transport.deleteStop`.

  **Tab 4 — `StudentAssignmentTab` (NEW):**
  - Summary strip: Search Results count, Using Transport (transportRouteId != null), Not Assigned.
  - Search bar with debounce (350ms) + clear (X) button. Calls `api.students.list({ q })` when `q.trim().length >= 2` (uses `enabled` to gate the query).
  - Results table (`max-h-[60vh] overflow-y-auto scroll-thin`): Student Name (+parent phone), Admission No, Class, Current Route (badge or italic "Not assigned"), Actions.
  - Per-row "Assign Route" / "Change" button (RBAC `students.edit`) → inline Select dropdown listing all routes + "— Unassign —" → `api.transport.assignStudent(studentId, routeId|null)`. Toast on success; invalidates the search query.
  - Falls back to "View only" text for roles without students.edit.

  **Shared helpers:**
  - `TableBodySkeletonCell` — single-cell skeleton row for loading states in tables.
  - `Metric` — small metric tile (preserved from original).
  - `LiveMap` — SVG live map (preserved exactly, including the 1.5s `setInterval` tick re-render for the HUD clock).
  - `VehicleFormDialog`, `StopFormDialog` — preserved (StopFormDialog extended with optional `mode`, `defaultRouteName`, `target` props to support both create-with-default-route and edit flows).
  - New dialogs: `DriverFormDialog` (create/edit), `RouteFormDialog` (create/edit with optional vehicleId assignment on create).

- Conventions followed per spec:
  - `'use client'` first line; imports include `useQuery/useMutation/useQueryClient`, `useCan`, `api`, `toast`, full `AlertDialog*` set, `Tabs*`, `Table*`, `Select*`, `Dialog*`, `Card*`, `Button`, `Input`, `Label`, `Badge`, `Skeleton`, `ScrollArea`, `Separator`.
  - shadcn components exclusively from `@/components/ui/*`; icons from `lucide-react`.
  - Emerald/teal/amber/rose/violet/cyan accents only — NO indigo/blue. (`VEH_COLORS` changed from `['#10b981','#14b8a6','#f59e0b','#f43f5e','#8b5cf6','#0ea5e9']` to swap the sky-blue `#0ea5e9` for cyan `#06b6d4`.)
  - Responsive (mobile-first): TabsList is `w-full sm:w-auto` and horizontally scrollable on small screens; stat cards `grid-cols-2 md:grid-cols-4`; route cards `grid-cols-1 lg:grid-cols-2`; all tables wrapped in `<div className="max-h-[60vh] overflow-y-auto scroll-thin">` with sticky headers.
  - All mutations use `useMutation` + `qc.invalidateQueries` + `toast.success`/`toast.error`.
  - AlertDialog for every delete confirmation with a rose-600 `AlertDialogAction`.
  - Every create/edit/delete/assign button wrapped in `useCan()('transport'|'students', action)` — admin/super_admin/transport_manager see all controls; teacher sees view-only; student/parent see view-only (no create/edit/delete/assign buttons).
  - Live GPS preserved: socket.io connection still uses `io('/?XTransformPort=3003')` with the same transports/reconnection options; `vehicles:update` listener still calls `setLiveVehicles(data)`; `refetchInterval: connected ? false : 3000` polling fallback stays exactly as before; `<LiveMap>` SVG component unchanged (same BOUNDS, project(), grid, road paths, school marker, stop markers, vehicle markers with heading arrows + ping animation, HUD overlays).
  - No `useEffect` setState anti-patterns introduced (the LiveMap `setInterval` tick is the existing pattern and does not trigger `react-hooks/set-state-in-effect`).

Verification:
- ESLint: `cd /home/z/my-project && timeout 90 bun node_modules/eslint/bin/eslint.js src/components/modules/transport.tsx 2>&1 | tail -20` → **0 errors, 0 warnings, exit 0**.
- TypeScript: `bunx tsc --noEmit` reports only pre-existing config-level errors in OTHER files (TanStack query .d.ts target-version warnings, sonner esModuleInterop, etc.) — zero new errors introduced by transport.tsx.
- Dev log: `✓ Compiled in 75ms` / `✓ Compiled in 134ms` after edits — no compile errors. Mini-service still streaming `POST /api/transport/update 200` continuously (every ~16ms), confirming the live GPS pipeline is untouched.

Stage Summary:
- Transport module now exposes 4 fully-functional tabs: (1) Live Tracking with the original live map + fleet list + vehicle detail + route stops + vehicle/stop CRUD; (2) Drivers management with stat strip, table, full CRUD, and inline bus-assignment Select; (3) Routes management with stat strip, card grid, full CRUD, inline bus-assignment Select, and expandable per-route Manage Stops sub-view with its own stop CRUD; (4) Student Assignment with debounced search, summary strip, results table, and inline route-assignment Select.
- All actions RBAC-guarded client-side via `useCan()` (admin/super_admin/transport_manager → full CRUD; teacher → view-only; student/parent → view-only). Backend already enforces the same via `requirePerm` on every endpoint.
- Live GPS tracking (socket.io on port 3003 + `<LiveMap>` SVG + polling fallback) preserved 1:1 from the original implementation — hoisted the socket + vehicles query to the top-level `TransportModule` so the GPS stream keeps flowing even when the user is on the Drivers/Routes/Student Assignment tabs.
- Lint status: 0 errors, 0 warnings. Dev server compiles cleanly. No backend changes were needed (all 8 transport API routes — vehicles, drivers, routes, stops, assign-student + their [id] handlers — were already in place).


---
Task ID: TM-1..7
Agent: main + subagent (task 6)
Task: Implement Transport Manager role + driver/route/bus/stop/student-assignment management

Work Log:
- Schema: added Driver model (name, phone, licenseNo, status, vehicleId @unique → 1:1 with Vehicle), Route model (name @unique, description, status, stops[], vehicles[]), linked Vehicle↔Route (routeId), TransportStop↔Route (routeId), Student↔Route (routeId). Kept legacy string fields (routeName, driverName, driverPhone, transportRouteId) for GPS tracker backward compat.
- RBAC: added transport_manager role — transport (full CRUD), students (view+edit for assignment), dashboard (view), communication (view+send), ai-assistant (view). Updated ROLE_LABELS/DESCRIPTIONS.
- Seed: created 6 Route records (matching existing vehicle routeNames), linked vehicles + stops + drivers to routes; created 9 Drivers (6 assigned to buses + 3 available); created transport_manager user (transport@vidyamatrix.edu / transport123).
- Backend API routes (all requirePerm-guarded):
  - /api/transport/drivers (GET, POST) + [id] (PATCH edit, PUT assign-to-bus, DELETE)
  - /api/transport/routes (GET, POST create-with-optional-bus) + [id] (PATCH edit, PUT assign-bus-to-route, DELETE with cascade-unlink)
  - /api/transport/assign-student (POST — assigns/unassigns route to student)
- Updated login overlay (6 demo accounts incl Transport Manager), topbar (role icon Bus + teal badge + switch-user dropdown), api.ts (drivers/routes/assignDriver/assignBusToRoute/assignStudent helpers).
- Subagent rewrote Transport module UI with 4 tabs: Live Tracking (preserved GPS), Drivers (CRUD + assign-to-bus), Routes (CRUD + assign-bus + manage stops), Student Assignment (search + assign route).
- Verified: transport_manager login → correct sidebar (Dashboard/Students/Transport/Communication/AI) → Drivers tab (created Suresh Kumar) → Routes tab (created Route 7 - Whitefield + assigned bus) → Student Assignment (assigned Route 7 to Vivaan Sharma, reflected in UI) → denied HR/Fees (403). Admin also has full transport CRUD (confirmed via API + UI).
- Live GPS tracker still streaming (POST /api/transport/update 200 every 1.5s); all 6 buses moving on map.

Stage Summary:
- Transport Manager role fully implemented with all requested capabilities: add bus, add route, assign bus to route, add stops, create new route + assign bus, assign driver to bus, add new driver, assign bus/route to student.
- Both admin AND transport_manager can perform all transport CRUD. Other roles (teacher/student/parent) view-only or denied.
- ESLint: 0 errors. Dev server + transport tracker healthy. Agent-browser verified.

---
Task ID: STUD-1..5
Agent: main
Task: Admin assigns bus/route to student in student module + restrict student/parent modules to own data only

Work Log:
- Added transport route assignment to StudentProfileDrawer: interactive "Assign Route" / "Change" button (guarded by canEdit) with a Select dropdown of all routes; calls api.transport.assignStudent(studentId, routeId). Shows route name + bus number badge when assigned. For view-only roles (student/parent), shows route name from student.transportRouteId without edit buttons.
- Added routeId field to Student type + verified student detail API returns it.
- Restricted StudentsModule for student role: replaced institution-wide stat cards with personal stats (My Attendance, My Avg Score, Fees Paid, Fee Due from /api/dashboard/me); added "My Profile" banner; hid search bar, class/status filters, export, Add Student; auto-opens own profile drawer; table shows "My Name" header and hides Parent column.
- Restricted StudentsModule for parent role: replaced stats with My Children count, Using Transport, Total Fees Due, Avg Attendance (scoped to children); added "My Children" banner; added child filter buttons (All + each child by name); hid search/filters/export/Add Student; hides Parent column.
- Verified data isolation: student sees only own record (1 row, auto-opens profile, route visible without edit buttons); parent sees only 2 children (with child filter); parent denied 403 on unrelated students' detail/fees/attendance APIs; admin sees all students with full CRUD + route assignment.

Stage Summary:
- Admin & transport_manager can assign bus/route to any student directly in the Students module profile drawer (no need to go to Transport module).
- Student role: sees ONLY own profile, personal stats, no search/filters, no edit buttons, auto-opens own drawer.
- Parent role: sees ONLY children's profiles, child filter, no search/filters, no edit buttons.
- Backend already enforces scoping (403 on unauthorized access). UI now matches.
- ESLint: 0 errors. Agent-browser verified all 3 roles (admin assign, student own-only, parent children-only).
