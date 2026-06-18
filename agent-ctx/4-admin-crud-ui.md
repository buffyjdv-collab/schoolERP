# Task 4 — Admin CRUD UI (Fees / Exams / Timetable)

**Agent**: 4-admin-crud-ui
**Task**: Add admin/super_admin-only Create/Edit/Delete UI (dialogs + buttons + AlertDialog confirmations) to 3 existing ERP module files (`fees.tsx`, `exams.tsx`, `timetable.tsx`), all guarded by `useCan()` permission checks. The backend CRUD API routes were already built and the `api` helper already exposes the methods.

## Files modified

1. `src/components/modules/fees.tsx` — Create / Edit / Delete Fee Structure + Create / Delete Invoice.
2. `src/components/modules/exams.tsx` — Create / Edit / Delete Exam + Edit-Mode inline marks entry.
3. `src/components/modules/timetable.tsx` — Add Slot (click empty cell) + Delete Slot (click filled cell).

No backend changes were needed — every CRUD endpoint called here already exists and is permission-guarded server-side (`requirePerm`).

## What was added per module

### 1. Fees module (`fees.tsx`)
- Added imports: `useMutation`, `useQueryClient`, `AlertDialog*`, `Pencil`, `Trash2`, `Plus`, plus types `FeeStructure`, `Student`, `ClassInfo`.
- `FeesModule` now reads `canEdit = useCan()('fees','edit')` and `canDelete = useCan()('fees','delete')` in addition to the existing `canCreate`/`canCollect`/`canPay`.
- Added two new useQuery hooks (cached, shared queryKeys): `['classes']` (for the fee-structure class picker) and `['students','list','fees-crud']` (for the invoice student picker).
- Added 5 mutations, each invalidating the relevant queryKey(s) + `toast.success` on success + `toast.error` on error:
  - `createStructMut` → `api.fees.createStructure(data)`
  - `updateStructMut` → `api.fees.updateStructure(id, data)`
  - `deleteStructMut` → `api.fees.deleteStructure(id)`
  - `createInvMut` → `api.fees.createInvoice({ studentId, feeStructureId })` — also invalidates `['fee-summary']`
  - `deleteInvMut` → `api.fees.deleteInvoice(id)` — also invalidates `['fee-summary']`
- **Create Fee Structure**: the existing "Add Structure" button (already `canCreate`-guarded) now opens a real `FeeStructureDialog` (name, class picker, amount, frequency [Annual/Term/Monthly/OneTime], dueDate). The dialog has create/edit modes driven by the `structDialog` state (`{ mode: 'create' | 'edit'; target? }`).
- **Edit Fee Structure**: each row in the Fee Structure table now has a `Pencil` icon button (only when `canEdit`) — opens `FeeStructureDialog` pre-filled from the clicked structure. Added an "Actions" column header (only rendered when `canEdit || canDelete`).
- **Delete Fee Structure**: each row has a `Trash2` icon button (rose tint, only when `canDelete`) → `<AlertDialog>` showing structure name + class + frequency + amount + warning that existing invoices won't be affected → red `AlertDialogAction` "Yes, delete" → `deleteStructMut`.
- **Create Invoice**: new "Create Invoice" button in the Invoices tab header (next to the Export button, only when `canCreate`). Opens `CreateInvoiceDialog` with a searchable student picker (filter by name/admission no/class — the `Select` shows the first 100 matches) and a fee structure picker (shows name + class + amount + frequency). A live preview card summarizes student + fee + amount + due date when both are selected.
- **Delete Invoice**: each invoice row now has a `Trash2` icon button next to the existing Collect/Receipt button (only when `canDelete`) → `<AlertDialog>` showing invoice no + student + amount + status → red action → `deleteInvMut`.
- All 5 dialogs/alert-dialogs are conditionally rendered at the bottom of `FeesModule` via `{state && <Component />}` so they mount fresh each time (initial state derived from `target`/`null` — no set-state-in-effect issues).
- Existing functionality preserved: KPI cards, charts, Invoices/Defaulters/Structures/Accounting tabs, PaymentDialog, defaulters list, accounting export panel — all untouched.

### 2. Exams module (`exams.tsx`)
- Added imports: `useMutation`, `useQueryClient`, `Dialog*`, `AlertDialog*`, `Input`, `Label`, `Plus`, `Pencil`, `Trash2`.
- `ExamsModule` now reads `canCreate`, `canEdit`, `canDelete` in addition to the existing `canEnter`.
- Added state: `examDialog` (`{ mode, target? }`), `examDelete` (`Exam | null`).
- Added 3 mutations: `createExamMut` (`api.exams.create`), `updateExamMut` (`api.exams.update`), `deleteExamMut` (`api.exams.remove`) — each invalidates `['exams','list']`, toasts on success/error. Delete also clears `selectedId` if the deleted exam was the selected one.
- **Create Exam**: new "New Exam" button (`Plus` icon) at the top of the exam-list pane header (next to the count badge), only when `canCreate`. Opens `ExamDialog` (name, examType [Unit Test/Mid Term/Final/Online], startDate, endDate with `endDate ≥ startDate` validation).
- **Edit Exam**: each `ExamListItem` now accepts `canEdit`/`canDelete`/`onEdit`/`onDelete` props and renders an "Edit" (`Pencil`) + "Delete" (`Trash2`, rose) footer row (only when `canEdit || canDelete`). The footer uses `onClick={(e) => e.stopPropagation()}` so clicking Edit/Delete doesn't also select the exam. Edit opens `ExamDialog` pre-filled from the clicked exam.
- **Delete Exam**: each `ExamListItem`'s Delete button opens `<AlertDialog>` showing exam name + type + date range + warning that all marks entered will be lost → red action → `deleteExamMut`.
- The card wrapper of `ExamListItem` was changed from `<button>` to `<div>` (with `cursor-pointer` + `onClick`) so the inner Edit/Delete buttons don't nest inside a button (invalid HTML). ARIA/keyboard behaviour preserved (clickable card).
- **Enter Marks (Edit Mode)**: `MarksSheetTab` now accepts a `canEnter` prop. When `canEnter` is true, an **Edit Mode** toggle button appears in the Marks Sheet card header (outline → default variant when active, label switches to "Done Editing"). A helper hint banner ("Click any marks cell to edit. Press Enter or click away to save.") shows when edit mode is on. When edit mode is on, every marks cell renders a new `EditableMarkCell` (small inline `<input type="number">`) instead of the static `<span>`. On blur or Enter, the cell calls `enterMarksMut.mutate({ examId, studentId, subject, maxMarks, obtained })` → `api.exams.enterMarks` → invalidates `['exams','marks', examId, classId]` + `['exams','list']` + toast `Marks saved · {subject}: {obtained}/{maxMarks}`. The `EditableMarkCell` uses `key={\`${studentId}-${subject}-${obtained ?? 'null'}\`}` so it remounts with the new server value after a save (no set-state-in-effect needed). When edit mode is off (or `canEnter` is false), the original read-only spans render with their existing color coding. Empty cells (no existing mark) also render an input in edit mode, using the subject's known `maxMarks` from the column header.
- Existing functionality preserved: stat cards, exam list, Progress Card tab (with radar + co-scholastic), Analysis tab (bar + pie), parent child selector, "Can enter marks" badge — all untouched.

### 3. Timetable module (`timetable.tsx`)
- Added imports: `useMutation`, `useQueryClient`, `useCan`, `Dialog*`, `AlertDialog*`, `Input`, `Label`, `Plus`, `Trash2`, `cn` from `@/lib/utils`, `TimetableSlot` type.
- `TimetableModule` now reads `canCreate = useCan()('academics','create')` and `canDelete = useCan()('academics','delete')`.
- Added state: `addTarget` (`{ day, period } | null`), `deleteTarget` (`TimetableSlot | null`).
- Added 2 mutations: `addSlotMut` (`api.academics.addSlot`), `deleteSlotMut` (`api.academics.deleteSlot`) — each invalidates `['timetable', classId, sectionId]`, toasts on success/error.
- Fixed the `grid` typing: `Record<string, Record<number, TimetableSlot[]>>` (was previously `typeof slots` which was `TimetableSlot[] | undefined` — worked at runtime but typed loosely).
- **Add Slot**: an "Add Slot" button appears in the `SectionHeader` action area (only when `canCreate && classId`). Clicking it toggles "Add mode" — the button label switches to "Cancel Add" and becomes primary-filled. A banner appears above the grid: "Add mode active: click any empty cell (—) in the grid below to open the slot dialog." When add mode is active (or whenever `canCreate && classId`), every empty cell renders as a `<button>` with a hover state (`hover:bg-primary/10 hover:text-primary hover:border-primary/40`) showing a `Plus` icon (in add mode) or `—` (otherwise). Clicking an empty cell sets `addTarget = { day, period }` → opens `AddSlotDialog` (regardless of add mode — empty cells are always clickable for admins). The dialog pre-fills Day + Period (read-only displays) + Start/End Time (initialized from the PERIODS table), and accepts subjectName, teacherName, room, optional section picker (only shown when the current view is "All Sections"). On submit → `addSlotMut.mutate({ classId, sectionId?, day, period, subjectName, teacherName, room, startTime, endTime })`.
- **Delete Slot**: when `canDelete`, every filled cell renders as a `<button>` (instead of a `<div>`) with `hover:ring-2 hover:ring-rose-400/50` to indicate clickability. Clicking opens an `<AlertDialog>` that shows the full slot details (Day · Period, Time, Subject, Teacher, Room, Class/Section) in a styled summary card + the warning text "Delete this slot? This action cannot be undone." → red `AlertDialogAction` "Delete slot" (with `Trash2` icon) → `deleteSlotMut`.
- The optional section picker in `AddSlotDialog` uses a `"__all__"` sentinel value because Radix Select doesn't support empty-string item values. On submit, the sentinel is converted back to "no sectionId" (omitted from the payload).
- Existing functionality preserved: weekly grid rendering, class/section selectors, subject color coding, subject legend, Export PDF button (now shares the action row with Add Slot) — all untouched.

## Conventions followed
- `'use client'` first line preserved on all 3 module files.
- Every create/edit/delete button guarded by `useCan()('module','action')` — admin & super_admin only (teachers/students/parents get `false`).
- All mutations use `useMutation` from `@tanstack/react-query` + `qc.invalidateQueries` on success + `toast.success(...)`/`toast.error(...)` from sonner.
- All delete confirmations use shadcn `<AlertDialog>` with rose-600 `AlertDialogAction` (`hover:bg-rose-700 text-white`) — matches the pattern from Task 3.
- Emerald/teal accent preserved throughout. No indigo/blue introduced.
- Responsive (mobile-first): all action buttons use `size="sm"` + `h-8`/`h-7`, icon-only buttons use `size="icon"` + `size-7`. Timetable grid still horizontally scrolls on mobile with `min-w-[800px]` inside `overflow-x-auto`. Dialogs use `max-w-md` / `max-w-lg` and stack fields vertically.
- No `useEffect` anywhere — all form/dialog state initialised via `useState(target?.X ?? default)` and remounted via conditional rendering + `key` props. No `react-hooks/set-state-in-effect` violations.
- Existing functionality untouched in all 3 files — only additive CRUD UI.
- AlertDialog description for the timetable slot uses `asChild` with a `<div>` wrapper (instead of nesting `<div>` inside the default `<p>`) to keep HTML semantically valid.

## Verification
- ESLint: `cd /home/z/my-project && timeout 90 bun node_modules/eslint/bin/eslint.js src/components/modules/fees.tsx src/components/modules/exams.tsx src/components/modules/timetable.tsx 2>&1 | tail -20` → **exit 0, 0 errors, 0 warnings**.
- Dev log: server compiled successfully after each save (`✓ Compiled in 543ms / 138ms / 145ms / 130ms / 148ms / 129ms / 124ms / 141ms / 204ms / 192ms / 216ms / 386ms`). No errors, no warnings, no exceptions.

## Stage Summary
- 3 ERP module files now have full admin CRUD UI, all RBAC-guarded client-side (`useCan`) and server-side (`requirePerm` on the existing routes):
  - **Fees**: Create/Edit/Delete Fee Structure (dialog with class picker + frequency select + amount + due date), Create Invoice (searchable student picker + fee structure picker + live preview), Delete Invoice (AlertDialog).
  - **Exams**: Create/Edit/Delete Exam (dialog with type select + date range + validation), inline marks entry via an "Edit Mode" toggle that turns every cell into an input (blur/Enter saves via `api.exams.enterMarks`).
  - **Timetable**: Add Slot (click empty cell → dialog pre-filled with day/period/time, accepts subject/teacher/room/section), Delete Slot (click filled cell → AlertDialog with full slot details).
- All admin/super_admin actions now have proper UI; teachers see only "Edit Mode" for marks (enter permission), students/parents see no create/edit/delete buttons.
- Lint status: 3 files, 0 errors, 0 warnings, exit 0.
