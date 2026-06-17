// RBAC Engine — single source of truth for role-based permissions.
// Isomorphic (used on both server and client).

export type Role = 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent'

export type ModuleId =
  | 'dashboard' | 'students' | 'admissions' | 'academics' | 'attendance'
  | 'fees' | 'exams' | 'timetable' | 'transport' | 'library'
  | 'hr' | 'communication' | 'assets' | 'ai-assistant'

export type Action =
  | 'view' | 'create' | 'edit' | 'delete' | 'approve'
  | 'export' | 'collect' | 'mark' | 'enter' | 'send'
  | 'issue' | 'return' | 'pay' | 'run'

export const ALL_MODULES: ModuleId[] = [
  'dashboard', 'ai-assistant', 'admissions', 'students', 'academics', 'attendance',
  'exams', 'timetable', 'fees', 'hr', 'transport', 'library', 'assets', 'communication',
]

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrator',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: 'Full system access including user management',
  admin: 'Full operational access to all school modules',
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
  },
  admin: {
    dashboard: A(['view','export']), 'ai-assistant': A(['view']),
    admissions: A(['view','create','edit','approve']),
    students: A(['view','create','edit','export']),
    academics: A(['view','create','edit']),
    attendance: A(['view','mark','export']),
    exams: A(['view','enter','edit','export']),
    timetable: A(['view','create','edit','export']),
    fees: A(['view','create','edit','collect','export']),
    hr: A(['view','create','edit','approve','run','export']),
    transport: A(['view','create','edit','export']),
    library: A(['view','create','edit','issue','return','export']),
    assets: A(['view','create','edit','export']),
    communication: A(['view','send','export']),
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

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  employeeId?: string | null
  studentId?: string | null
  teacherClassIds: string[]
  childrenStudentIds: string[]
}

/** Whether the user sees all records or a scoped subset. */
export function isStaff(role: Role): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'teacher'
}

/** Student IDs a user is allowed to see. Returns 'all' for admin/super_admin. */
export function visibleStudentIds(user: AuthUser): string[] | 'all' {
  if (user.role === 'super_admin' || user.role === 'admin') return 'all'
  if (user.role === 'student') return user.studentId ? [user.studentId] : []
  if (user.role === 'parent') return user.childrenStudentIds
  if (user.role === 'teacher') return 'all' // teacher filtering is class-based; applied separately
  return []
}

/** Class IDs a teacher can access (empty = all for admin). */
export function visibleClassIds(user: AuthUser): string[] | 'all' {
  if (user.role === 'super_admin' || user.role === 'admin') return 'all'
  if (user.role === 'teacher') return user.teacherClassIds
  // student/parent — derived from their student(s)
  return 'all' // caller will further filter by student ids
}
