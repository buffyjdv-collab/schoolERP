// RBAC Engine — single source of truth for role-based permissions.
// Isomorphic (used on both server and client).
// Supports 3 layers: (1) hardcoded role defaults → (2) DB role overrides → (3) DB per-user overrides.
// Per-user overrides (layer 3) are ONLY available for admin, transport_manager, and teacher roles.
// Student and Parent roles use role-level permissions ONLY (no per-user customization).

export type Role = 'super_admin' | 'admin' | 'transport_manager' | 'teacher' | 'student' | 'parent'

export type ModuleId =
  | 'dashboard' | 'students' | 'admissions' | 'academics' | 'attendance'
  | 'fees' | 'exams' | 'timetable' | 'transport' | 'library'
  | 'hr' | 'communication' | 'assets' | 'ai-assistant' | 'user-management'

export type Action =
  | 'view' | 'create' | 'edit' | 'delete' | 'approve'
  | 'export' | 'collect' | 'mark' | 'enter' | 'send'
  | 'issue' | 'return' | 'pay' | 'run'

export type DataScope = 'all' | 'own' | 'children' | 'assigned_classes' | 'none'

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
  super_admin: 'Full system access including user & role management',
  admin: 'Full operational access to all school modules',
  transport_manager: 'Manage buses, routes, drivers, stops & student transport',
  teacher: 'Class teacher — academic operations for assigned classes',
  student: 'Student — view own academic, attendance & fee records',
  parent: 'Parent — monitor children\'s progress, attendance & fees',
}

export const SCOPE_LABELS: Record<DataScope, string> = {
  all: 'All Records',
  own: 'Own Records Only',
  children: 'Children Only',
  assigned_classes: 'Assigned Classes',
  none: 'No Access',
}

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

export const ACTION_LABELS: Record<Action, string> = {
  view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete', approve: 'Approve',
  export: 'Export', collect: 'Collect', mark: 'Mark', enter: 'Enter', send: 'Send',
  issue: 'Issue', return: 'Return', pay: 'Pay', run: 'Run',
}

// ============ HARDCODED ROLE DEFAULTS (layer 1) ============

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
    fees: A(['view','create','edit','delete','collect','export']),
    hr: A(['view','create','edit','delete','approve','run','export']),
    transport: A(['view','create','edit','delete','export']),
    library: A(['view','create','edit','delete','issue','return','export']),
    assets: A(['view','create','edit','delete','export']),
    communication: A(['view','send','delete','export']),
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
    students: A(['view','edit']),
    transport: A(['view','create','edit','delete','export']),
    communication: A(['view','send']),
  },
  teacher: {
    dashboard: A(['view']), 'ai-assistant': A(['view']),
    admissions: A(['view']),
    students: A(['view','edit']),
    academics: A(['view']),
    attendance: A(['view','mark']),
    exams: A(['view','enter']),
    timetable: A(['view']),
    fees: A(['view']),
    transport: A(['view']),
    library: A(['view','issue','return']),
    assets: A(['view']),
    communication: A(['view','send']),
  },
  student: {
    dashboard: A(['view']), 'ai-assistant': A(['view']),
    students: A(['view']),
    academics: A(['view']),
    attendance: A(['view']),
    exams: A(['view']),
    timetable: A(['view']),
    fees: A(['view','pay']),
    transport: A(['view']),
    library: A(['view']),
    communication: A(['view']),
  },
  parent: {
    dashboard: A(['view']), 'ai-assistant': A(['view']),
    students: A(['view']),
    academics: A(['view']),
    attendance: A(['view']),
    exams: A(['view']),
    timetable: A(['view']),
    fees: A(['view','pay']),
    transport: A(['view']),
    library: A(['view']),
    communication: A(['view']),
  },
}

// ============ OVERRIDE TYPES (layers 2 & 3) ============

export interface ModuleOverride {
  actions?: Action[] | null
  dataScope?: DataScope | null
  enabled?: boolean | null
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
  overrides?: UserOverrides  // per-user customizations (only for admin/teacher/transport_manager)
  roleOverrides?: RoleOverrides  // role-level DB overrides (sent to client for sidebar)
}

// ============ ROLE-LEVEL DB OVERRIDES (layer 2) ============

export interface RoleOverride {
  actions?: Action[] | null
  dataScope?: DataScope | null
  enabled?: boolean | null
}

export type RoleOverrides = Partial<Record<ModuleId, RoleOverride>>

let roleOverridesCache: Record<string, RoleOverrides> | null = null

export function setRoleOverridesCache(overrides: Record<string, RoleOverrides>) {
  roleOverridesCache = overrides
}

export function clearRoleOverridesCache() {
  roleOverridesCache = null
}

/** Get the role-level overrides for a specific role from the cache. */
export function getRoleOverrides(role: string): RoleOverrides | undefined {
  return roleOverridesCache?.[role]
}

/** Check if a role supports full per-user overrides (actions + enabled + dataScope). */
export function supportsPerUserOverrides(role: Role): boolean {
  return role === 'admin' || role === 'transport_manager' || role === 'teacher'
}

/** Check if a role supports per-user DATA SCOPE overrides only (no action/module toggle).
 *  Student and Parent can have their data scope customized per-user, but NOT which modules they see or what CRUD actions they can do.
 */
export function supportsPerUserDataScope(role: Role): boolean {
  return role === 'student' || role === 'parent'
}

// ============ DYNAMIC PERMISSION CHECKS (with overrides) ============

/**
 * Resolve effective actions for a user on a module.
 *
 * PRECEDENCE (role is supreme):
 *   1. Role-level DB override (Layer 2) — SUPREME. If set, per-user overrides are IGNORED.
 *   2. Per-user DB override (Layer 3) — ONLY for admin/teacher/transport_manager roles.
 *      Student and Parent roles skip this layer entirely (role-only permissions).
 *   3. Hardcoded role default (Layer 1) — fallback.
 *
 * Super admin is always unrestricted.
 */
export function effectiveActions(user: AuthUser, module: ModuleId): Action[] {
  if (user.role === 'super_admin') return PERMISSIONS.super_admin[module] ?? []

  // Layer 2: role-level DB override — SUPREME, checked first
  // On server: use roleOverridesCache. On client: use user.roleOverrides (sent from server).
  const roleDbOv = roleOverridesCache?.[user.role]?.[module] ?? user.roleOverrides?.[module]
  if (roleDbOv !== undefined) {
    if (roleDbOv.enabled === false) return []
    if (roleDbOv.actions !== undefined && roleDbOv.actions !== null) return roleDbOv.actions
  }

  // Layer 3: per-user override — ONLY for roles that support it (NOT student/parent)
  if (supportsPerUserOverrides(user.role)) {
    const ov = user.overrides?.[module]
    if (ov?.enabled === false) return []
    if (ov?.actions !== undefined && ov.actions !== null) return ov.actions
  }

  // Layer 1: hardcoded default
  return PERMISSIONS[user.role]?.[module] ?? []
}

/** Check if a USER (with overrides) can perform an action on a module. */
export function canUser(user: AuthUser, module: ModuleId, action: Action = 'view'): boolean {
  return effectiveActions(user, module).includes(action)
}

/** Modules a USER can view (considers all override layers — used by sidebar). */
export function accessibleModulesForUser(user: AuthUser): ModuleId[] {
  return ALL_MODULES.filter((m) => canUser(user, m, 'view'))
}

/** Effective data scope for a user on a module (role supreme > per-user > static). */
export function effectiveDataScope(user: AuthUser, module: ModuleId): DataScope {
  if (user.role === 'super_admin' || user.role === 'admin') return 'all'
  // Role DB override is SUPREME (server cache or client-side user.roleOverrides)
  const roleDbOv = roleOverridesCache?.[user.role]?.[module] ?? user.roleOverrides?.[module]
  if (roleDbOv?.dataScope) return roleDbOv.dataScope
  // Per-user override — for admin/teacher/transport_manager (full overrides) AND student/parent (dataScope only)
  if (supportsPerUserOverrides(user.role) || supportsPerUserDataScope(user.role)) {
    const ov = user.overrides?.[module]
    if (ov?.dataScope) return ov.dataScope
  }
  // Static default
  if (user.role === 'student') return 'own'
  if (user.role === 'parent') return 'children'
  if (user.role === 'teacher' || user.role === 'transport_manager') return 'assigned_classes'
  return 'none'
}

// ============ LEGACY ROLE-ONLY FUNCTIONS ============

export function can(role: Role, module: ModuleId, action: Action = 'view'): boolean {
  const actions = PERMISSIONS[role]?.[module]
  return !!actions && actions.includes(action)
}

export function accessibleModules(role: Role): ModuleId[] {
  return ALL_MODULES.filter((m) => can(role, m, 'view'))
}

export function actionsFor(role: Role, module: ModuleId): Action[] {
  return PERMISSIONS[role]?.[module] ?? []
}

// ============ DATA SCOPING HELPERS ============

export function isStaff(role: Role): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'teacher' || role === 'transport_manager'
}

export function visibleStudentIds(user: AuthUser): string[] | 'all' {
  const scope = effectiveDataScope(user, 'students')
  if (scope === 'all') return 'all'
  if (scope === 'own') return user.studentId ? [user.studentId] : []
  if (scope === 'children') return user.childrenStudentIds
  if (scope === 'assigned_classes') return 'all'
  return []
}

export function visibleClassIds(user: AuthUser): string[] | 'all' {
  if (user.role === 'super_admin' || user.role === 'admin') return 'all'
  if (user.role === 'teacher' || user.role === 'transport_manager') return user.teacherClassIds
  return 'all'
}
