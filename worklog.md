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
