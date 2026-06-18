# Task 3 — Admin CRUD UI (Students / Admissions / Academics)

**Agent**: 3-admin-crud-ui
**Task**: Add admin/super_admin-only Create/Edit/Delete UI (dialogs + buttons + AlertDialog confirmations) to 3 existing ERP module files, all guarded by `useCan()` permission checks.

## Files modified

### UI files (the assigned scope)
1. `src/components/modules/students.tsx` — Edit + Delete student from the profile drawer.
2. `src/components/modules/admissions.tsx` — Delete Enquiry + Delete Application from the actions dropdowns.
3. `src/components/modules/academics.tsx` — Add Class, Rename Class, Delete Class, Add Section, Add Subject, Delete Timetable Slot.

### Backend route additions (minimal, required for UI to function)
The spec said *"backend CRUD API routes are ALL already built and working"*, but on inspection the admissions routes had no `DELETE` handlers. To make the new Delete Enquiry / Delete Application UI actually work, I added minimal `DELETE` handlers (3 lines each):
- `src/app/api/admissions/enquiries/[id]/route.ts` — `DELETE` → `requirePerm('admissions','delete')` + `db.admissionEnquiry.delete`
- `src/app/api/admissions/applications/[id]/route.ts` — `DELETE` → `requirePerm('admissions','delete')` + `db.application.delete`

These match the existing pattern in `students/[id]/route.ts` DELETE handler.

## What was added per module

### 1. Students module (`students.tsx`)
- Added imports: `AlertDialog*` from `@/components/ui/alert-dialog`, `Pencil` + `Trash2` icons, `ClassInfo` type.
- `StudentProfileDrawer` now reads `canEdit = useCan()('students','edit')` and `canDelete = useCan()('students','delete')`, fetches `classes` (cached via the shared `['classes']` queryKey), and owns two new mutations:
  - `updateMut` → `api.students.update(id, data)` → invalidates `['students']` + `['student', id]`, closes dialog, toast "Student updated successfully".
  - `deleteMut` → `api.students.remove(id)` (soft-delete → Inactive) → invalidates `['students']` + `['stats']`, closes drawer, toast "Student marked as Inactive".
- Drawer footer restructured: a new top row (only rendered if `canEdit || canDelete`) holds the **Edit** button (outline, with `Pencil` icon) and a **Delete** button (destructive, with `Trash2` icon). The existing ID Card / Bonafide / Collect Fee row is untouched below.
- Delete button uses `<AlertDialog>` with the exact required copy: "This will mark {fullName} as Inactive. Continue?" → red AlertDialogAction "Yes, mark Inactive".
- New `EditStudentDialog` (controlled by `editOpen` state) wraps `EditStudentForm` (with `key={student.id}` so state resets per student — no set-state-in-effect needed). Form pre-fills all 15 spec'd fields: `firstName, lastName, dob, gender, bloodGroup, phone, email, fatherName, motherName, parentPhone, parentEmail, classId, address, medicalInfo, status`. On submit calls `updateMut.mutate({ id, data })`.

### 2. Admissions module (`admissions.tsx`)
- Added imports: `AlertDialog*`, `Trash2`, `useCan` from `@/lib/store`.
- `EnquiriesTable` and `ApplicationsTable` each read `canDelete = useCan()('admissions','delete')` and own a state-controlled `deleteTarget` plus a `deleteMut` that calls `DELETE /api/admissions/enquiries/{id}` (or `applications`) **directly via fetch** (per spec — no api helper exists for delete). On success → toast + invalidate `['admissions','enquiries']` / `['admissions','applications']` + clear `deleteTarget`.
- Each table's actions dropdown gains a destructive "Delete Enquiry" / "Delete Application" item at the bottom (after the existing note/email section, preceded by a `DropdownMenuSeparator`). Only visible when `canDelete`.
- Each table's return is now wrapped in a `<>…</>` fragment so a sibling `<AlertDialog>` can render the confirm prompt. Confirm copy: "This will permanently delete {studentName}'s admission enquiry/application. This action cannot be undone." → red "Yes, delete".
- Existing status-advance / Approve / Reject dropdown items untouched.

### 3. Academics module (`academics.tsx`)
- Added imports: `useMutation`, `useQueryClient`, `useCan`, `toast`, `Button`, `Label`, `Dialog*`, `AlertDialog*`, `Plus`, `Pencil`, `Trash2`.
- `AcademicsModule` now reads `canCreate / canEdit / canDelete = useCan()('academics', …)` and owns **4 mutations**: `createClassMut`, `updateClassMut`, `deleteClassMut`, `deleteSlotMut` — each invalidating `['academics','classes']` (or `['academics','timetable']` for slot delete) + appropriate toast + dialog close.
- **Add Class** button (outline, `Plus` icon, "Add") added to the left-pane classes-list header next to the count badge — only when `canCreate`. Opens `AddClassDialog` (single `name` field → `api.academics.createClass({ name })`).
- **Rename / Delete Class** buttons added to the right-pane class summary card header (after the Students/Sections/Subjects stats). Rename opens `EditClassDialog` (single `name` field, pre-filled, `key={cls.id}`) → `api.academics.updateClass(id, { name })`. Delete opens an `<AlertDialog>` confirming "permanently delete {name} along with its sections, subjects and timetable slots" → `api.academics.deleteClass(id)` + clears `selectedId`.
- `SectionsSubjectsTab` now takes a `canEdit` prop. When `canEdit`, an "Add Section" button appears next to the Sections heading and "Add Subject" next to the Subjects heading. The tab owns its own `addSectionMut` / `addSubjectMut` (invalidate `['academics','classes']` + toast + close).
- `AddSectionDialog` — fields: `name` (required), `capacity` (default 40), `teacherId` (optional text — `teacherId` is a free `String?` in Prisma with no FK constraint, so any string works; empty → backend stores null). Calls `api.academics.addSection(classId, data)`.
- `AddSubjectDialog` — fields: `name` (required), `code` (auto-generated by backend if blank), `teacherId` (optional). Calls `api.academics.addSubject(classId, data)`.
- `TimetableGrid` now takes `canDelete` and `onSlotClick` props. When `canDelete`, every filled slot cell becomes a `<button>` with `cursor-pointer` + rose-tinted hover border + a tiny "click to delete" hint. Clicking calls `onSlotClick(slot)` which sets `deleteSlotTarget` in `AcademicsModule`, opening an `<AlertDialog>` showing the slot's subject + day + period + time + teacher and a red "Delete this slot" action → `api.academics.deleteSlot(slotId)` → invalidate `['academics','timetable']`.
- Section/subject cards now also fall back to displaying `teacherId` if `teacherName` is missing (the GET `/api/academics/classes` route currently returns `teacherId` only, not `teacherName`).

## Conventions followed
- Each file still starts with `'use client'`.
- All mutations use `useMutation` + `qc.invalidateQueries` + `toast.success(...)` from sonner. Errors go through `toast.error(...)`.
- Every create/edit/delete button is wrapped in a `useCan()('module','action')` check — admin & super_admin see them; teacher/student/parent do not.
- Emerald/teal accent preserved; destructive actions use rose-600 AlertDialogAction with `hover:bg-rose-700`. No indigo/blue.
- Existing functionality untouched — only additive CRUD UI.
- AlertDialog used for all delete confirmations (per spec).
- Responsive (mobile-first; new buttons use `size="sm"` + `h-8` to match the existing compact button style; class header actions wrap on small screens).
- No `useEffect` used; form state initialized via `useState` initializer + `key={entity.id}` to force remount on entity change (avoids `react-hooks/set-state-in-effect` violations).

## Verification
- `bun node_modules/eslint/bin/eslint.js src/components/modules/students.tsx src/components/modules/admissions.tsx src/components/modules/academics.tsx` → **exit 0, 0 errors, 0 warnings**.
- `bunx tsc --noEmit` → only **pre-existing** error in `students.tsx:294` (the `<Info icon={Heart} label="Gender" value={student?.gender} />` line — `student?.gender` is `string | undefined` while `Info.value` expects `string`). Verified via `git stash` that this error exists on the unmodified file (was at line 258 before my 36-line insertion above it). Not introduced by this task.
- Backend routes lint clean too: `eslint src/app/api/admissions/enquiries/[id]/route.ts src/app/api/admissions/applications/[id]/route.ts` → exit 0.
- Dev log: `✓ Compiled in 141ms / 192ms / 216ms / 386ms` after each save — no compile errors. (Pre-existing 405 on `GET /api/hr/employees` is unrelated to this task.)

## Stage summary
3 ERP module files now have full admin CRUD UI, all RBAC-guarded:
- **Students**: Edit (15-field dialog) + Delete (AlertDialog → soft-delete to Inactive) from the profile drawer.
- **Admissions**: Delete Enquiry + Delete Application (AlertDialog confirm, fetch-based DELETE) from the actions dropdowns.
- **Academics**: Add Class, Rename Class, Delete Class, Add Section, Add Subject, Delete Timetable Slot — all wired to `api.academics.*` mutations.

Plus 2 minimal backend `DELETE` handlers added to admissions routes (3 lines each) to make the Delete UI functional end-to-end. All RBAC enforced both client-side (button visibility) and server-side (`requirePerm`).

Lint status: 3 module files + 2 route files, **0 errors, 0 warnings, exit 0**.
