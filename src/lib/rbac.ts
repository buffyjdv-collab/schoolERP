// RBAC Engine — single source of truth for role-based permissions.
// Isomorphic (used on both server and client).

export type Role = 'super_admin' | 'admin' | 'transport_manager' | 'teacher' | 'student' | 'parent'

export type ModuleId =
  | 'dashboard' | 'students' | 'admissions' | 'academics' | 'attendance'
  | 'fees' | 'exams' | 'timetable' | 'transport' | 'library'
  | 'hr' | 'communication' | 'assets' | 'ai-assistant' | 'user-management'

export type Action =
  | 'view' | 'create' | 'edit' | 'delete' | 'approve'
  | 'export' | 'collect' | 'mark' | 'enter' | 'send'
  | 'issue' | 'return' | 'pay' | 'run'

export const ALL_MODULES: ModuleId[] = [
  'dashboard', 'ai-assistant', 'admissions', 'students', 'academics', 'attendance',
  'exams', 'timetable', 'fees', 'hr', 'transport', 'library', 'assets', 'communication',
  'user-management',
]

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrator',
  transport_manager: 'Transport Manager',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: 'Full system access including user management',
  admin: 'Full operational access to all school modules',
  transport_manager: 'Manage buses, routes, drivers, stops & student transport assignments',
  teacher: 'Class teacher — academic operations for assigned classes',
  student: 'Student — view own academic, attendance & fee records',
  parent: 'Parent — monitor children\'s progress, attendance & fees',
}

// Permission matrix: role → module → allowed actions
// 'view' is implied if any action is present.
const A = (actions: Action[]) => actions

export const PERMISSIONS: Record<Role, Partial<Record<ModuleId, Action[]>>> = {
  super_admin: {
    dashboard: A(['view','export']), 'ai-assistant': A(['view']),
    admissions: A(['view','create','edit','delete','approve']),
    students: A(['view','create','edit','delete','export']),
    academics: A(['view','create','edit','delete']),
    attendance: A(['view','mark','export']),
    exams: A(['view','enter','edit','delete','export']),
    timetable: A(['view','create','edit','delete','export']),
    fees: A(['view','create','edit','collect','export']),
    hr: A(['view','create','edit','approve','run','export']),
    transport: A(['view','create','edit','export']),
    library: A(['view','create','edit','issue','return','export']),
    assets: A(['view','create','edit','delete','export']),
    communication: A(['view','send','export']),
    'user-management': A(['view','create','edit','delete']),
  },
  admin: {
    dashboard: A(['view','export']), 'ai-assistant': A(['view']),
    admissions: A(['view','create','edit','delete','approve']),
    students: A(['view','create','edit','delete','export']),
    academics: A(['view','create','edit','delete']),
    attendance: A(['view','mark','export']),
    exams: A(['view','enter','edit','delete','export']),
    timetable: A(['view','create','edit','delete','export']),
    fees: A(['view','create','edit','delete','collect','export']),
    hr: A(['view','create','edit','delete','approve','run','export']),
    transport: A(['view','create','edit','delete','export']),
    library: A(['view','create','edit','delete','issue','return','export']),
    assets: A(['view','create','edit','delete','export']),
    communication: A(['view','send','delete','export']),
  },
  transport_manager: {
    dashboard: A(['view']), 'ai-assistant': A(['view']),
    students: A(['view','edit']),               // view all + assign routes
    transport: A(['view','create','edit','delete','export']),  // full transport CRUD
    communication: A(['view','send']),          // notify parents about transport
  },
  teacher: {
    dashboard: A(['view']), 'ai-assistant': A(['view']),
    admissions: A(['view']),
    students: A(['view','edit']),           // view own-class students, edit attendance-related
    academics: A(['view']),
    attendance: A(['view','mark']),         // mark for own classes
    exams: A(['view','enter']),             // enter marks for own classes
    timetable: A(['view']),
    fees: A(['view']),                      // view class fee status (no collect)
    transport: A(['view']),
    library: A(['view','issue','return']),
    assets: A(['view']),
    communication: A(['view','send']),      // message own class
  },
  student: {
    dashboard: A(['view']), 'ai-assistant': A(['view']),
    students: A(['view']),                  // own profile only
    academics: A(['view']),
    attendance: A(['view']),                // own attendance
    exams: A(['view']),                     // own results
    timetable: A(['view']),                 // own timetable
    fees: A(['view','pay']),                // own fees, can pay
    transport: A(['view']),                 // own route
    library: A(['view']),                   // own issued books
    communication: A(['view']),
  },
  parent: {
    dashboard: A(['view']), 'ai-assistant': A(['view']),
    students: A(['view']),                  // children profiles
    academics: A(['view']),
    attendance: A(['view']),                // children attendance
    exams: A(['view']),                     // children results
    timetable: A(['view']),
    fees: A(['view','pay']),                // children fees, can pay
    transport: A(['view']),                 // children routes
    library: A(['view']),
    communication: A(['view']),
  },
}

/** Check if a role can perform an action on a module. */
export function can(role: Role, module: ModuleId, action: Action = 'view'): boolean {
  const actions = PERMISSIONS[role]?.[module]
  return !!actions && actions.includes(action)
}

/** Modules a role can view (for sidebar filtering). */
export function accessibleModules(role: Role): ModuleId[] {
  return ALL_MODULES.filter((m) => can(role, m, 'view'))
}

/** Highest-privilege indicator for a module (for showing action buttons). */
export function actionsFor(role: Role, module: ModuleId): Action[] {
  return PERMISSIONS[role]?.[module] ?? []
}

// ============ DATA SCOPING ============

export type DataScope = 'all' | 'own' | 'children' | 'assigned_classes' | 'none'

export const SCOPE_LABELS: Record<DataScope, string> = {
  all: 'All Records',
  own: 'Own Records Only',
  children: 'Children Only',
  assigned_classes: 'Assigned Classes',
  none: 'No Access',
}

// ============ ROLE-LEVEL DB OVERRIDES (Super Admin role management) ============
// Super Admin can customize the base permission matrix for an entire role via DB.
// These overrides apply to ALL users with that role (unless individually overridden).
// The cache is populated server-side at request time via loadRoleOverrides().

export interface RoleOverride {
  actions?: Action[] | null
  dataScope?: DataScope | null
  enabled?: boolean | null
}

export type RoleOverrides = Partial<Record<ModuleId, RoleOverride>>

// In-memory cache of role overrides (keyed by role). Refreshed per request on server.
let roleOverridesCache: Record<string, RoleOverrides> | null = null

/** Set the role overrides cache (called server-side at request start). */
export function setRoleOverridesCache(overrides: Record<string, RoleOverrides>) {
  roleOverridesCache = overrides
}

/** Clear the cache. */
export function clearRoleOverridesCache() {
  roleOverridesCache = null
}

/** Get effective role-level actions for a module (DB override > static PERMISSIONS). */
export function roleEffectiveActions(role: Role, module: ModuleId): Action[] {
  if (role === 'super_admin') return PERMISSIONS.super_admin[module] ?? []
  const dbOv = roleOverridesCache?.[role]?.[module]
  if (dbOv?.enabled === false) return []
  if (dbOv?.actions !== undefined && dbOv?.actions !== null) return dbOv.actions
  return PERMISSIONS[role]?.[module] ?? []
}

/** Get effective role-level data scope for a module. */
export function roleEffectiveDataScope(role: Role, module: ModuleId): DataScope {
  if (role === 'super_admin' || role === 'admin') return 'all'
  const dbOv = roleOverridesCache?.[role]?.[module]
  if (dbOv?.dataScope) return dbOv.dataScope
  if (role === 'student') return 'own'
  if (role === 'parent') return 'children'
  if (role === 'teacher') return 'assigned_classes'
  return 'none'
}

/** Per-module override for a specific user. null fields = inherit role default. */
export interface ModuleOverride {
  actions?: Action[] | null      // null = inherit role; [] = no actions; [...] = custom set
  dataScope?: DataScope | null   // null = inherit role
  enabled?: boolean | null       // null = inherit role; true = force on; false = force off
}

export type UserOverrides = Partial<Record<ModuleId, ModuleOverride>>

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  employeeId?: string | null
  studentId?: string | null
  teacherClassIds: string[]
  childrenStudentIds: string[]
  overrides?: UserOverrides  // per-user customizations set by super admin
}

/** Whether the user sees all records or a scoped subset. */
export function isStaff(role: Role): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'teacher'
}

/** Effective actions for a user on a module (user override > role DB override > static PERMISSIONS). */
export function effectiveActions(user: AuthUser, module: ModuleId): Action[] {
  // Super admin always full access (can't be restricted)
  if (user.role === 'super_admin') return PERMISSIONS.super_admin[module] ?? []
  const ov = user.overrides?.[module]
  // User-level force-disable
  if (ov?.enabled === false) return []
  // User-level custom actions override
  if (ov?.actions !== undefined && ov.actions !== null) return ov.actions
  // Fall back to role-level DB override (or static PERMISSIONS)
  return roleEffectiveActions(user.role, module)
}

/** Check if a USER (with overrides) can perform an action on a module. */
export function canUser(user: AuthUser, module: ModuleId, action: Action = 'view'): boolean {
  return effectiveActions(user, module).includes(action)
}

/** Modules a USER can view (considers overrides). */
export function accessibleModulesForUser(user: AuthUser): ModuleId[] {
  return ALL_MODULES.filter((m) => canUser(user, m, 'view'))
}

/** Effective data scope for a user on a module (user override > role DB override > static). */
export function effectiveDataScope(user: AuthUser, module: ModuleId): DataScope {
  if (user.role === 'super_admin' || user.role === 'admin') return 'all'
  const ov = user.overrides?.[module]
  if (ov?.dataScope) return ov.dataScope
  return roleEffectiveDataScope(user.role, module)
}

/** Student IDs a user is allowed to see. Returns 'all' for admin/super_admin. */
export function visibleStudentIds(user: AuthUser): string[] | 'all' {
  const scope = effectiveDataScope(user, 'students')
  if (scope === 'all') return 'all'
  if (scope === 'own') return user.studentId ? [user.studentId] : []
  if (scope === 'children') return user.childrenStudentIds
  if (scope === 'assigned_classes') return 'all' // teacher filtering applied separately
  return []
}

/** Class IDs a teacher can access (empty = all for admin). */
export function visibleClassIds(user: AuthUser): string[] | 'all' {
  if (user.role === 'super_admin' || user.role === 'admin') return 'all'
  if (user.role === 'teacher') return user.teacherClassIds
  return 'all'
}

// ============ MODULE METADATA (for permission matrix UI) ============

export const MODULE_LABELS: Record<ModuleId, string> = {
  dashboard: 'Dashboard & MIS',
  'ai-assistant': 'AI Assistant',
  admissions: 'Admissions',
  students: 'Student Management',
  academics: 'Academics',
  attendance: 'Attendance',
  exams: 'Examinations',
  timetable: 'Timetable',
  fees: 'Fees & Accounts',
  hr: 'HR & Payroll',
  transport: 'Transport & GPS',
  library: 'Library',
  assets: 'Assets & Inventory',
  communication: 'Communication',
  'user-management': 'User Management',
}

export const MODULE_DESCRIPTIONS: Record<ModuleId, string> = {
  dashboard: 'Institution-wide analytics, KPIs and MIS reports',
  'ai-assistant': 'AI-powered assistant for data queries and message drafting',
  admissions: 'Admission enquiries, applications and approval pipeline',
  students: 'Student master records, profiles and transport assignment',
  academics: 'Classes, sections, subjects and timetable management',
  attendance: 'Daily attendance marking, UHF/RFID and class-wise rates',
  exams: 'Exam scheduling, marks entry, progress cards and analysis',
  timetable: 'Weekly class timetable generation and editing',
  fees: 'Fee structures, invoices, collection, defaulters and accounting',
  hr: 'Employee management, leave approvals and payroll processing',
  transport: 'Buses, routes, drivers, stops and live GPS tracking',
  library: 'Book catalog, issue/return and fine management',
  assets: 'Fixed asset register with QR tagging and maintenance',
  communication: 'SMS, Email, WhatsApp messaging and notification history',
  'user-management': 'User accounts, role assignment and permission control',
}

/** All actions that can be toggled per module. */
export const ALL_ACTIONS: Action[] = [
  'view', 'create', 'edit', 'delete', 'approve', 'export',
  'collect', 'mark', 'enter', 'send', 'issue', 'return', 'pay', 'run',
]

export const ACTION_LABELS: Record<Action, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  approve: 'Approve',
  export: 'Export',
  collect: 'Collect',
  mark: 'Mark',
  enter: 'Enter',
  send: 'Send',
  issue: 'Issue',
  return: 'Return',
  pay: 'Pay',
  run: 'Run',
}

/** Actions relevant to each module (for the permission matrix). */
export const MODULE_ACTIONS: Record<ModuleId, Action[]> = {
  dashboard: ['view', 'export'],
  'ai-assistant': ['view'],
  admissions: ['view', 'create', 'edit', 'delete', 'approve'],
  students: ['view', 'create', 'edit', 'delete', 'export'],
  academics: ['view', 'create', 'edit', 'delete'],
  attendance: ['view', 'mark', 'export'],
  exams: ['view', 'enter', 'edit', 'delete', 'export'],
  timetable: ['view', 'create', 'edit', 'delete', 'export'],
  fees: ['view', 'create', 'edit', 'delete', 'collect', 'export'],
  hr: ['view', 'create', 'edit', 'delete', 'approve', 'run', 'export'],
  transport: ['view', 'create', 'edit', 'delete', 'export'],
  library: ['view', 'create', 'edit', 'delete', 'issue', 'return', 'export'],
  assets: ['view', 'create', 'edit', 'delete', 'export'],
  communication: ['view', 'send', 'delete', 'export'],
  'user-management': ['view', 'create', 'edit', 'delete'],
}
