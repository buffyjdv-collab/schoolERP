# Task 6 — user-management-ui (Super Admin access-control panel)

## Task
Rewrite `/home/z/my-project/src/components/modules/user-management.tsx` to build the Super Admin's tabbed user management UI:
- **Tab 1 — Role Permissions**: group-level overrides (`RolePermission` table layer 2)
- **Tab 2 — User Permissions**: per-user overrides (`UserPermission` table layer 3)

Backend API routes (`/api/admin/roles`, `/api/admin/roles/[role]/permissions`, `/api/admin/users`, `/api/admin/users/[id]/permissions`, `/api/admin/users/[id]`) were already built and verified working (dev.log shows 200s). The `api.admin.*` helper was already in `src/lib/api.ts`. RBAC metadata was already exported from `src/lib/rbac.ts` (`ALL_MODULES`, `MODULE_LABELS`, `MODULE_DESCRIPTIONS`, `MODULE_ACTIONS`, `ACTION_LABELS`, `ROLE_LABELS`, `ROLE_DESCRIPTIONS`, `SCOPE_LABELS`, `PERMISSIONS`, plus types).

## File written

`src/components/modules/user-management.tsx` (~830 lines, single file, exports `UserManagementModule`).

## Architecture

### Super-admin gate
The whole module is gated on `useStore().user?.role === 'super_admin'`. Non-super-admins see an `EmptyState` "Access Denied" card.

### Tabs
Two tabs via shadcn `Tabs` (`defaultValue="roles"`): `Role Permissions` (Layers icon) and `User Permissions` (Users icon).

### Shared helpers (top of file)
- `countFor(userCounts, role)` — looks up `_count` from the prisma `groupBy` array, tolerating both `number` and `{ _all: number }` shapes.
- `initials(name)`, `overrideCount(o)`, `cloneOverrides(o)`, `isDirty(a, b)` (JSON.stringify compare).
- `roleEffectiveActions/Enabled/Scope(module, role, roleOverrides)` — effective state for layer 1 + layer 2.
- `userEffectiveActions/Enabled/Scope(module, role, roleOverrides, userOverrides)` — effective state for all 3 layers (priority: user override → role override → hardcoded default). Mirrors the `effectiveActions` logic in `rbac.ts`.
- `detectLayer(module, roleOverrides, userOverrides)` → `'user_override' | 'role_override' | 'role_default'`.

### Shared sub-components
- **`LayerBadge`** — color-coded pill: amber `User override` (UserCog icon), teal `Role override` (Layers icon), emerald `Role default` (CheckCircle2 icon).
- **`ActionChip`** — toggle button per action. Color: `green` (enabled AND in hardcoded role default), `amber` (enabled AND added via override), `gray` (disabled). Shows check icon when active.
- **`ModuleCard`** — one card per module. Header: module label + description + "Custom" amber badge if any override exists + `Switch` (enable/disable) + optional `LayerBadge`. Body: action chips for every action in `MODULE_ACTIONS[module]`, optional `Select` for data scope (only shown for non-admin/non-super_admin roles — `all`/`own`/`children`/`assigned_classes`/`none`), and (Tab 2 only) an "Inherits from role" footer showing the role-effective actions + scope for comparison.

### Tab 1 — `RolePermissionsTab`
- `useQuery(['admin-roles'])` → `api.admin.roles()` for the role list (with overrides + user counts).
- `useQuery(['admin-role-perms', role])` → `api.admin.getRolePermissions(role)` for the selected role's defaults + overrides + userCount (skipped for `super_admin`).
- **Left pane** (`lg:col-span-1`): list of 6 `RoleListItem` cards — icon (Crown/ShieldCheck/Bus/GraduationCap/Users/BookUser), label, description, user count, override count. Super_admin card shows a "Locked" amber badge. Clicking selects.
- **Right pane** (`lg:col-span-2`):
  - If selected role is `super_admin` → locked notice card ("Cannot be modified — Super Admin permissions are hardcoded").
  - Otherwise → `RolePermissionsEditor` (keyed by role so local draft resets on switch).
- **`RolePermissionsEditor`**:
  - Amber warning banner: "Changes affect ALL users with this role. {N} users currently hold {role}. Individual user-level overrides take precedence."
  - Toolbar: "X modules with custom overrides" + dirty indicator + Reset button (AlertDialog confirm, disabled when no overrides) + Save button (disabled when not dirty).
  - Masonry grid (`columns-1 lg:columns-2 [&>*]:break-inside-avoid`) of `ModuleCard`s for all 15 modules, wrapped in `max-h-[60vh] overflow-y-auto scroll-thin`.
  - `Save` mutation → `api.admin.saveRolePermissions(role, draft)` → invalidate `['admin-roles']` + `['admin-role-perms', role]` → toast `"Permissions saved — affects N users"`.
  - `Reset` mutation → `api.admin.resetRolePermissions(role)` → same invalidations + `setDraft({})` → toast `"Reset to defaults"`.

### Tab 2 — `UserPermissionsTab`
- `useQuery(['admin-users'])` → `api.admin.users()` for the user list.
- `useQuery(['admin-user-perms', userId])` → `api.admin.getUserPermissions(userId)` for selected user's `roleDefaults` + `roleOverrides` + `userOverrides`.
- **Left pane**: search input (filters by name/email/role/role label) + scrollable list of `UserListItem` cards — avatar with initials, name, role badge, active/inactive pill, "Custom" amber badge if overrides exist, teacherClassCount/childrenCount chips. Clicking selects.
- **Right pane**: `UserPermissionsEditor` keyed by userId (resets draft on switch).
- **`UserPermissionsEditor`**:
  - Locked notice for `super_admin` users ("Cannot be modified — always have full system access") and for self (`user.id === me.id`, "Cannot modify your own account").
  - **User header card**: avatar + name + role badge (primary tinted) + active status pill + "Custom (N)" amber badge if overrides + email + Change Role `Select` (all 6 roles) + Activate/Deactivate `Button`.
  - Toolbar: same as Tab 1 (count + dirty + Reset/Save).
  - Module matrix: same masonry layout; each `ModuleCard` shows `LayerBadge` (user_override/role_override/role_default) + "Custom" badge if either user or role override exists + the "Inherits from role" footer with role-effective actions + scope.
  - Mutations:
    - `saveUserPermissions(userId, draft)` → invalidates `['admin-users']` + `['admin-user-perms', userId]` → toast `"User permissions saved"`.
    - `resetUserPermissions(userId)` → same invalidations + `setDraft({})` → toast `"Reset to role defaults"`.
    - `setUserRole(userId, newRole)` → same invalidations + `setDraft({})` (server clears user overrides on role change) → toast `"Role changed to {label}"`.
    - `toggleUserActive(userId, !active)` → invalidates `['admin-users']` + `['admin-user-perms', userId]` → toast `"User activated"` / `"User deactivated"`.
  - All mutations show loading state on buttons and disable inputs while pending.

## Critical conventions followed
- File starts with `'use client'`.
- Imports: `useQuery/useMutation/useQueryClient` from `@tanstack/react-query`; `api` from `@/lib/api`; `useStore` from `@/lib/store`; `toast` from `sonner`; RBAC metadata + types from `@/lib/rbac`; `LucideIcon` type from `lucide-react`.
- shadcn components used: `Card`/`CardContent`/`CardHeader`/`CardTitle`, `Button`, `Input`, `Badge`, `Skeleton`, `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`, `Switch`, `Avatar`/`AvatarFallback`, `Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem`, `AlertDialog` (+ all sub-parts).
- Shared primitives: `SectionHeader`, `EmptyState` from `@/components/erp/primitives`.
- Icons from `lucide-react`: ShieldCheck, Users, Search, Lock, RotateCcw, Save, AlertTriangle, CheckCircle2, UserCog, Crown, GraduationCap, Bus, BookUser, ChevronRight, Power, SlidersHorizontal, KeyRound, Layers, ShieldAlert, UserX, UserCheck, Pencil.
- All mutations use `qc.invalidateQueries` + `toast.success` (and `toast.error` on error).
- `AlertDialog` wraps both Reset buttons (Tab 1 + Tab 2) with explicit confirm copy and a rose-tinted action button.
- Module matrix wrapped in `<div className="max-h-[60vh] overflow-y-auto scroll-thin pr-1">` with masonry-style `columns-1 lg:columns-2 [&>*]:break-inside-avoid`.
- Action chips color-coded: green (in default), amber (override-added), gray (disabled).
- Layer badges: amber (user override), teal (role override), emerald (role default) — satisfies the "make it clear which layer is active" UX requirement.
- "Custom" amber badge on any module card that has an override (role or user level).
- "Inherits from role" indicator on Tab 2 module cards showing role-effective actions + scope for comparison.
- Emerald/teal accent throughout. NO indigo/blue.
- Responsive: `grid-cols-1 lg:grid-cols-3` two-pane layout; mobile-first; touch-friendly button sizes.
- Effect-free: no `useEffect`. Local draft state via `useState` initialized from server data; the editor components are keyed by role/userId so they remount (re-initializing state) when selection changes. No `set-state-in-effect` violations.
- Date formatting not needed (no dates displayed).

## Verification

### ESLint
`cd /home/z/my-project && bun node_modules/eslint/bin/eslint.js src/components/modules/user-management.tsx` → **exit 0, 0 errors, 0 warnings**.

### TypeScript
`bunx tsc --noEmit` → no errors in `user-management.tsx`. (Other pre-existing errors in unrelated files: examples/websocket, mini-services/transport-tracker, skills/*, src/app/api/hr/payroll/route.ts, login-overlay, sidebar, topbar, students — none touched by this task.)

### Dev log
Checked `/home/z/my-project/dev.log` — backend endpoints already returning 200s:
- `GET /api/admin/roles 200`
- `GET /api/admin/users 200`
- `PUT /api/admin/roles/admin/permissions 200`
- `DELETE /api/admin/roles/admin/permissions 200`

No compile errors after writing the file.

## Stage Summary
`UserManagementModule` is production-ready, lint-clean, type-safe, responsive, and follows the emerald/teal accent convention. It fully exposes all 8 `api.admin.*` methods (roles, getRolePermissions, saveRolePermissions, resetRolePermissions, users, getUserPermissions, saveUserPermissions, resetUserPermissions, setUserRole, toggleUserActive) in a clear two-tab interface that makes the 3-layer permission model (hardcoded → role override → user override) visually obvious via layer badges, "Custom" badges, color-coded chips, and "Inherits from role" indicators.
