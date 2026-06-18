// Shared types for ERP modules
export type ModuleId =
  | 'dashboard' | 'students' | 'admissions' | 'academics' | 'attendance'
  | 'fees' | 'exams' | 'timetable' | 'transport' | 'library'
  | 'hr' | 'communication' | 'assets' | 'ai-assistant' | 'settings' | 'user-management'

export interface Student {
  id: string
  admissionNo: string
  firstName: string
  lastName: string
  fullName: string
  dob: string
  gender: string
  bloodGroup?: string | null
  religion?: string | null
  nationality: string
  address?: string | null
  phone?: string | null
  email?: string | null
  fatherName?: string | null
  motherName?: string | null
  guardianName?: string | null
  parentPhone?: string | null
  parentEmail?: string | null
  parentOccupation?: string | null
  classId?: string | null
  className?: string
  sectionId?: string | null
  sectionName?: string
  rollNo?: number | null
  admissionDate: string
  previousSchool?: string | null
  medicalInfo?: string | null
  transportRouteId?: string | null
  routeId?: string | null
  hostelRoomId?: string | null
  status: string
  photo?: string | null
  attendancePercent?: number
  feeStatus?: string
}

export interface Employee {
  id: string
  empCode: string
  firstName: string
  lastName: string
  fullName: string
  designation: string
  department: string
  gender: string
  dob?: string | null
  phone: string
  email?: string | null
  address?: string | null
  joiningDate: string
  salary: number
  status: string
}

export interface FeeInvoice {
  id: string
  invoiceNo: string
  studentId: string
  studentName: string
  admissionNo: string
  className: string
  feeStructureId: string
  feeName: string
  amount: number
  paidAmount: number
  discount: number
  fine: number
  dueDate: string
  status: string
  paymentMethod?: string | null
  paymentDate?: string | null
  balance: number
  createdAt: string
}

export interface FeeStructure {
  id: string
  name: string
  classId: string
  className: string
  amount: number
  frequency: string
  dueDate?: string | null
}

export interface Vehicle {
  id: string
  vehicleNo: string
  type: string
  capacity: number
  driverName: string
  driverPhone: string
  routeName: string
  gpsDeviceId?: string | null
  currentLat?: number | null
  currentLng?: number | null
  speed?: number | null
  heading?: number | null
  lastUpdate?: string | null
  status: string
}

export interface Book {
  id: string
  accessionNo: string
  title: string
  author: string
  isbn?: string | null
  category: string
  publisher?: string | null
  price: number
  totalCopies: number
  available: number
  rack?: string | null
}

export interface LibraryIssue {
  id: string
  bookId: string
  bookTitle: string
  accessionNo: string
  studentId: string
  studentName: string
  admissionNo: string
  issueDate: string
  dueDate: string
  returnDate?: string | null
  fine: number
  status: string
}

export interface Exam {
  id: string
  name: string
  academicYearId: string
  examType: string
  startDate: string
  endDate: string
  status: string
  marksCount?: number
}

export interface ExamMark {
  id: string
  examId: string
  studentId: string
  studentName: string
  admissionNo: string
  className?: string
  subject: string
  maxMarks: number
  obtained?: number | null
  grade?: string | null
  remarks?: string | null
}

export interface AttendanceRecord {
  id: string
  studentId: string
  studentName: string
  admissionNo: string
  date: string
  status: string
  method: string
}

export interface TimetableSlot {
  id: string
  classId: string
  sectionId?: string | null
  className: string
  sectionName?: string
  day: string
  period: number
  subjectName: string
  teacherName: string
  room?: string | null
  startTime: string
  endTime: string
}

export interface LeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  empCode: string
  designation: string
  leaveType: string
  startDate: string
  endDate: string
  reason: string
  status: string
  appliedAt: string
}

export interface Payroll {
  id: string
  employeeId: string
  employeeName: string
  empCode: string
  month: string
  basicSalary: number
  allowances: number
  deductions: number
  netPay: number
  status: string
  paidAt?: string | null
}

export interface Asset {
  id: string
  assetCode: string
  name: string
  category: string
  location?: string | null
  purchaseDate: string
  purchaseValue: number
  condition: string
  assignedTo?: string | null
}

export interface Notification {
  id: string
  channel: string
  recipient: string
  subject?: string | null
  message: string
  category: string
  status: string
  createdAt: string
}

export interface AdmissionEnquiry {
  id: string
  studentName: string
  parentName: string
  phone: string
  email?: string | null
  classApplied: string
  source: string
  status: string
  message?: string | null
  createdAt: string
}

export interface Application {
  id: string
  studentName: string
  parentName: string
  phone: string
  email?: string | null
  dob?: string | null
  gender?: string | null
  address?: string | null
  classApplied: string
  previousSchool?: string | null
  status: string
  createdAt: string
}

export interface DashboardStats {
  totalStudents: number
  totalEmployees: number
  totalClasses: number
  presentToday: number
  absentToday: number
  attendanceRate: number
  feeCollected: number
  feePending: number
  feeDefaulters: number
  newAdmissions: number
  pendingLeaves: number
  booksIssued: number
  vehiclesActive: number
}

export interface ChartPoint {
  label: string
  value: number
  [key: string]: any
}

export interface ClassInfo {
  id: string
  name: string
  sections: { id: string; name: string; capacity: number; teacherId?: string | null; teacherName?: string | null; studentCount: number }[]
  subjects: { id: string; name: string; code: string; teacherId?: string | null; teacherName?: string | null }[]
  subjectCount: number
  studentCount: number
}
