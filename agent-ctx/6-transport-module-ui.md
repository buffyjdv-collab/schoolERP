# Task 6 — transport-module-ui (Transport module tabbed interface: Drivers / Routes / Student Assignment)

## Task
Rewrite `src/components/modules/transport.tsx` (`TransportModule`) to add a 4-tab interface on top of the existing live GPS tracking:
1. Live Tracking (existing — keep as-is, default tab)
2. Drivers (NEW — full CRUD + bus assignment)
3. Routes (NEW — full CRUD + bus assignment + per-route Manage Stops)
4. Student Assignment (NEW — search + assign route to student)

## Files Read (context)
- `worklog.md` — architecture overview, RBAC system, file-map conventions.
- `src/lib/api.ts` — confirmed all `api.transport.*` and `api.students.list` methods exist (drivers, createDriver, updateDriver, deleteDriver, assignDriver; routes, createRoute, updateRoute, deleteRoute, assignBusToRoute; assignStudent; stops, createStop, updateStop, deleteStop; vehicles CRUD).
- `src/lib/store.ts` — `useCan()` hook signature: `useCan()(module, action)`.
- `src/lib/rbac.ts` — `transport_manager` has `transport: [view, create, edit, delete, export]` + `students: [view, edit]` + `communication: [view, send]`. Admin/super_admin have full transport CRUD. Teacher/student/parent have only transport.view.
- `src/lib/types.ts` — `Vehicle` type, `Student` type (has `transportRouteId?: string | null`).
- `src/components/erp/primitives.tsx` — `StatCard`, `SectionHeader`, `StatusBadge`, `EmptyState`. `StatCard` accent options: primary/emerald/amber/rose/violet/sky.
- `src/components/ui/tabs.tsx` — `Tabs, TabsList, TabsTrigger, TabsContent` (Radix-based).
- `src/components/ui/table.tsx` — `Table, TableHeader, TableBody, TableHead, TableRow, TableCell`.
- All 5 transport backend route files — confirmed endpoints + payload shapes:
  - `POST /api/transport/drivers` accepts `{ name, phone, licenseNo?, address? }`.
  - `PATCH /api/transport/drivers/:id` accepts `{ name, phone, licenseNo, address, status }`.
  - `PUT /api/transport/drivers/:id` accepts `{ vehicleId }` — assigns driver to bus (1:1, unassigns previous), syncs driverName on vehicle.
  - `DELETE /api/transport/drivers/:id` — soft-delete (status→Inactive, vehicleId→null), does NOT delete the row.
  - `POST /api/transport/routes` accepts `{ name, description?, vehicleId? }` — optionally assigns a bus at creation.
  - `PATCH /api/transport/routes/:id` accepts `{ name, description, status }` — also syncs routeName on vehicles/stops if renaming.
  - `PUT /api/transport/routes/:id` accepts `{ vehicleId }` — if vehicleId given, assigns that single vehicle; if null, unassigns ALL vehicles.
  - `DELETE /api/transport/routes/:id` — unlinks vehicles/stops/students, then deletes the route.
  - `POST /api/transport/stops` accepts `{ name, routeName, lat, lng, pickupTime, dropTime, fare? }` (no routeId — stops linked by routeName string).
  - `POST /api/transport/assign-student` accepts `{ studentId, routeId }` — sets student.routeId + transportRouteId (route name).

## Files Modified
- `src/components/modules/transport.tsx` — full rewrite from 661 lines → 1704 lines. Single file, single export `TransportModule`.

## What Was Built (per tab)

### Tab 1 — Live Tracking (`LiveTrackingTab`)
- **Hoisted** socket.io + `liveVehicles` + `connected` + `vehicles` query + `stops` query from the original `TransportModule` body up to the new top-level `TransportModule` so the live GPS stream keeps flowing when the user switches to Drivers/Routes/Student Assignment tabs.
- 4 StatCards (Total Fleet, Moving Now, At Stops, GPS Status) — unchanged.
- Live Fleet Map card with `<LiveMap>` SVG (Bangalore bounds, road network paths, school marker, stop markers, vehicle markers with heading arrows + ping animation, HUD overlays) — unchanged.
- Fleet Status list (per-vehicle cards with status badge, route, speed, capacity) + "Add Vehicle" button (RBAC create).
- Selected-vehicle detail panel (6 Metric tiles + Edit/Delete buttons + Notify Pickup/Drop/Calculate ETA).
- Route Stops & Pickups card with Add Stop + per-stop Delete (AlertDialog).
- Existing `VehicleFormDialog` (create/edit) and `StopFormDialog` reused.
- `useEffect` socket setup with `io('/?XTransformPort=3003', { transports: ['websocket','polling'], forceNew: true, reconnection: true })` — preserved exactly. `connect`/`disconnect`/`vehicles:update` listeners preserved.
- `refetchInterval: connected ? false : 3000` polling fallback preserved exactly.

### Tab 2 — Drivers (`DriversTab`) — NEW
- **Stat strip** (4 StatCards): Total Drivers, Assigned (vehicleId != null), Available (free & status=Active), On Leave (status=OnLeave).
- **Drivers table** wrapped in `<div className="max-h-[60vh] overflow-y-auto scroll-thin">` with sticky header. Columns: Name (+address), Phone, License No, Status (StatusBadge), Assigned Bus, Actions.
- **Add Driver** button (`useCan('transport','create')`) → `<DriverFormDialog>` (name, phone, licenseNo, address, status-on-edit) → `api.transport.createDriver(data)` → toast + invalidate `['drivers']`.
- **Edit Driver** (pencil, `useCan('transport','edit')`) → `<DriverFormDialog mode="edit">` pre-filled → `api.transport.updateDriver(id, data)` → toast + invalidate `['drivers']` + `['vehicles']`.
- **Delete Driver** (rose trash, `useCan('transport','delete')`) → `<AlertDialog>` (explains soft-delete: status→Inactive + unassign) → `api.transport.deleteDriver(id)`.
- **Assign to Bus** — inline `<Select>` per row, value = `driver.vehicleId || '__none__'`. Options: "— Unassign —" + all vehicles (vehicleNo · routeName). Selecting calls `api.transport.assignDriver(id, vehicleId|null)`. Disabled (read-only Badge instead) for users without `transport.edit`.
- Loading state: 5 skeleton rows. Empty state: "No drivers yet" message.

### Tab 3 — Routes (`RoutesTab`) — NEW
- **Stat strip** (4 StatCards): Total Routes, Active (status=Active), Buses Assigned (sum of vehicles across routes), Total Stops (sum of stopCount).
- **Routes list** as cards (lg:grid-cols-2). Each card shows:
  - Route name + StatusBadge + description.
  - Meta strip: Stops count + Buses count.
  - Assigned Buses as chips (vehicleNo + driverName).
  - **Assign Bus to Route** inline `<Select>` (RBAC `transport.edit`) — lists all vehicles + "— Unassign all buses —" option. Calls `api.transport.assignBusToRoute(routeId, vehicleId|null)`. Single-select add (per backend: vehicleId assigns that one vehicle; null unassigns ALL).
  - Actions row: Edit, Manage Stops (toggle), Delete.
  - **Manage Stops** expandable sub-view: lists stops filtered by `stop.routeName === route.name` with per-stop Edit/Delete + an "Add Stop" button. Add Stop opens `<StopFormDialog>` with `defaultRouteName` pre-filled and routeName disabled. Stop edit/delete reuse `api.transport.updateStop`/`deleteStop`.
- **Add Route** button (RBAC create) → `<RouteFormDialog>` (name, description, optional vehicleId Select to assign a bus at creation — matches "create new route and assign bus to that route" requirement) → `api.transport.createRoute`.
- **Edit Route** → `<RouteFormDialog mode="edit">` → `api.transport.updateRoute`. Invalidates routes+vehicles+stops (since route rename syncs stop.routeName).
- **Delete Route** → `<AlertDialog>` (explains buses/stops/students get unlinked) → `api.transport.deleteRoute`. Invalidates routes+vehicles+stops+students.
- Loading state: 4 skeleton cards. Empty state: `<EmptyState icon={RouteIcon}>`.

### Tab 4 — Student Assignment (`StudentAssignmentTab`) — NEW
- **Summary strip** (3 StatCards): Search Results, Using Transport (transportRouteId != null), Not Assigned.
- **Search bar** with debounce (350ms) + clear (X) button. Calls `api.students.list({ q })` when `q.trim().length >= 2` (uses `enabled: debouncedQ.length >= 2`).
- **Results table** (`max-h-[60vh] overflow-y-auto scroll-thin`): Student Name (+parent phone), Admission No, Class, Current Route (badge or italic "Not assigned"), Actions.
- **Assign Route** button per row (`useCan('students','edit')`) → inline `<Select>` listing all routes + "— Unassign —" → `api.transport.assignStudent(studentId, routeId|null)`. Toast on success; invalidates the search query.
- Falls back to "View only" text for roles without `students.edit`.

## Conventions Followed
- `'use client'` first line; full import block matches spec (`useQuery/useMutation/useQueryClient`, `useCan`, `api`, `toast` from sonner, full `AlertDialog*` set, `Tabs*`, `Table*`, `Select*`, `Dialog*`, `Card*`, `Button`, `Input`, `Label`, `Badge`, `Skeleton`, `ScrollArea`, `Separator`, icons from `lucide-react`).
- shadcn components exclusively from `@/components/ui/*`.
- Emerald/teal/amber/rose/violet/cyan accents only — NO indigo/blue. `VEH_COLORS` swapped the sky-blue `#0ea5e9` for cyan `#06b6d4`.
- Responsive (mobile-first): TabsList `w-full sm:w-auto` + horizontal scroll on small screens; stat cards `grid-cols-2 md:grid-cols-4`; route cards `grid-cols-1 lg:grid-cols-2`; all tables wrapped in `<div className="max-h-[60vh] overflow-y-auto scroll-thin">` with sticky headers.
- All mutations: `useMutation` + `qc.invalidateQueries` + `toast.success`/`toast.error`.
- AlertDialog for every delete confirmation with rose-600 `AlertDialogAction` (`hover:bg-rose-700 text-white`).
- Every create/edit/delete/assign button wrapped in `useCan()('transport'|'students', action)`. admin/super_admin/transport_manager see all controls; teacher sees view-only on Drivers/Routes; student/parent see view-only across all transport tabs.
- Live GPS preserved 1:1: socket.io `io('/?XTransformPort=3003')`, `vehicles:update` listener, `refetchInterval: connected ? false : 3000` fallback, `<LiveMap>` SVG with BOUNDS/project/VEH_COLORS/grid/road paths/school/stop/vehicle markers + HUD overlays.
- Hoisted socket + `vehicles`/`stops` queries to top-level `TransportModule` so the GPS stream keeps flowing across tab switches (the original code lived in the component body and would have unmounted on tab switch).
- No backend changes — all 8 transport API endpoints were already in place.

## Verification
- ESLint: `cd /home/z/my-project && timeout 90 bun node_modules/eslint/bin/eslint.js src/components/modules/transport.tsx 2>&1 | tail -20` → **0 errors, 0 warnings, exit 0** (the `react-hooks/set-state-in-effect` rule did NOT trigger — the LiveMap `setInterval` callback is not "in-effect" per the rule's scope, so no inline disable comment was needed; I removed the one I tentatively added once ESLint reported it as unused).
- TypeScript: `bunx tsc --noEmit` reports only pre-existing config-level errors in OTHER files (TanStack query .d.ts target-version warnings, sonner esModuleInterop, `@/lib/*` path-alias not resolved by standalone tsc) — zero new errors introduced by transport.tsx.
- Dev log: `✓ Compiled in 75ms` / `✓ Compiled in 134ms` after edits — no compile errors, no exceptions. Mini-service still streaming `POST /api/transport/update 200` continuously (every ~16ms), confirming the live GPS pipeline is untouched.

## Stage Summary
Transport module now exposes 4 fully-functional tabs:
1. **Live Tracking** — original live map + fleet list + vehicle detail + route stops + vehicle/stop CRUD (preserved 1:1).
2. **Drivers** — stat strip + table + full CRUD + inline bus-assignment Select.
3. **Routes** — stat strip + card grid + full CRUD + inline bus-assignment Select + expandable per-route Manage Stops sub-view with its own stop CRUD.
4. **Student Assignment** — debounced search + summary strip + results table + inline route-assignment Select.

All actions RBAC-guarded client-side via `useCan()` (admin/super_admin/transport_manager → full CRUD; teacher → view-only; student/parent → view-only). Backend already enforces the same via `requirePerm` on every endpoint. Live GPS tracking (socket.io + LiveMap SVG + polling fallback) preserved exactly. Lint status: 0 errors, 0 warnings.
