// Typed fetch helpers for ERP API. Client-side.
import type {
  Student, Employee, FeeInvoice, FeeStructure, Vehicle, Book, LibraryIssue,
  Exam, ExamMark, AttendanceRecord, TimetableSlot, LeaveRequest, Payroll,
  Asset, Notification, AdmissionEnquiry, Application, DashboardStats, ClassInfo,
} from './types'

async function jfetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${txt || res.statusText}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  dashboard: {
    stats: () => jfetch<DashboardStats>('/api/dashboard/stats'),
    attendanceTrend: () => jfetch<{ label: string; present: number; absent: number }[]>('/api/dashboard/attendance-trend'),
    feeCollectionTrend: () => jfetch<{ label: string; collected: number; pending: number }[]>('/api/dashboard/fee-trend'),
    classDistribution: () => jfetch<{ label: string; value: number }[]>('/api/dashboard/class-distribution'),
    genderRatio: () => jfetch<{ label: string; value: number }[]>('/api/dashboard/gender-ratio'),
    recentActivity: () => jfetch<{ id: string; type: string; text: string; time: string }[]>('/api/dashboard/activity'),
    me: () => jfetch<any>('/api/dashboard/me'),
  },
  students: {
    list: (params?: { q?: string; classId?: string; status?: string }) => {
      const s = new URLSearchParams(params as any).toString()
      return jfetch<Student[]>(`/api/students${s ? '?' + s : ''}`)
    },
    get: (id: string) => jfetch<Student>(`/api/students/${id}`),
    attendance: (id: string) => jfetch<AttendanceRecord[]>(`/api/students/${id}/attendance`),
    fees: (id: string) => jfetch<FeeInvoice[]>(`/api/students/${id}/fees`),
    marks: (id: string) => jfetch<ExamMark[]>(`/api/students/${id}/marks`),
    create: (data: any) => jfetch<Student>('/api/students', { method: 'POST', body: JSON.stringify(data) }),
  },
  admissions: {
    enquiries: () => jfetch<AdmissionEnquiry[]>('/api/admissions/enquiries'),
    applications: () => jfetch<Application[]>('/api/admissions/applications'),
    updateEnquiry: (id: string, data: any) => jfetch<AdmissionEnquiry>(`/api/admissions/enquiries/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    updateApplication: (id: string, data: any) => jfetch<Application>(`/api/admissions/applications/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    createEnquiry: (data: any) => jfetch<AdmissionEnquiry>('/api/admissions/enquiries', { method: 'POST', body: JSON.stringify(data) }),
  },
  academics: {
    classes: () => jfetch<ClassInfo[]>('/api/academics/classes'),
    timetable: (classId: string, sectionId?: string) => {
      const s = new URLSearchParams({ classId, ...(sectionId ? { sectionId } : {}) }).toString()
      return jfetch<TimetableSlot[]>(`/api/academics/timetable?${s}`)
    },
  },
  attendance: {
    summary: (classId?: string) => jfetch<{ rate: number; present: number; absent: number; late: number; leave: number; byClass: { label: string; rate: number }[] }>(`/api/attendance/summary${classId ? '?classId=' + classId : ''}`),
    mark: (data: { studentId: string; date: string; status: string; method?: string }) => jfetch<any>('/api/attendance/mark', { method: 'POST', body: JSON.stringify(data) }),
    classAttendance: (classId: string, date: string) => jfetch<{ student: Student; status: string }[]>(`/api/attendance/class?classId=${classId}&date=${date}`),
  },
  fees: {
    structures: () => jfetch<FeeStructure[]>('/api/fees/structures'),
    invoices: (params?: { status?: string; q?: string }) => {
      const s = new URLSearchParams(params as any).toString()
      return jfetch<FeeInvoice[]>(`/api/fees/invoices${s ? '?' + s : ''}`)
    },
    summary: () => jfetch<{ collected: number; pending: number; defaulters: number; byStatus: { label: string; value: number }[]; byMethod: { label: string; value: number }[] }>('/api/fees/summary'),
    collect: (id: string, data: { paidAmount: number; paymentMethod: string }) => jfetch<FeeInvoice>(`/api/fees/invoices/${id}/pay`, { method: 'POST', body: JSON.stringify(data) }),
  },
  exams: {
    list: () => jfetch<Exam[]>('/api/exams'),
    marks: (examId: string, classId?: string) => {
      const s = new URLSearchParams({ examId, ...(classId ? { classId } : {}) }).toString()
      return jfetch<ExamMark[]>(`/api/exams/marks?${s}`)
    },
  },
  transport: {
    vehicles: () => jfetch<Vehicle[]>('/api/transport/vehicles'),
    stops: () => jfetch<{ id: string; name: string; routeName: string; lat: number; lng: number; pickupTime: string; dropTime: string; fare: number }[]>('/api/transport/stops'),
  },
  library: {
    books: (q?: string) => jfetch<Book[]>(`/api/library/books${q ? '?q=' + q : ''}`),
    issues: () => jfetch<LibraryIssue[]>('/api/library/issues'),
    issue: (data: { bookId: string; studentId: string }) => jfetch<LibraryIssue>('/api/library/issues', { method: 'POST', body: JSON.stringify(data) }),
    return: (id: string) => jfetch<LibraryIssue>(`/api/library/issues/${id}/return`, { method: 'POST' }),
  },
  hr: {
    employees: () => jfetch<Employee[]>('/api/hr/employees'),
    leaves: () => jfetch<LeaveRequest[]>('/api/hr/leaves'),
    approveLeave: (id: string, status: string) => jfetch<LeaveRequest>(`/api/hr/leaves/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    payroll: (month?: string) => jfetch<Payroll[]>(`/api/hr/payroll${month ? '?month=' + month : ''}`),
    runPayroll: (month: string) => jfetch<any>(`/api/hr/payroll/run`, { method: 'POST', body: JSON.stringify({ month }) }),
  },
  communication: {
    list: () => jfetch<Notification[]>('/api/communication/notifications'),
    send: (data: { channel: string; recipient: string; subject?: string; message: string; category: string }) => jfetch<Notification>('/api/communication/send', { method: 'POST', body: JSON.stringify(data) }),
  },
  assets: {
    list: () => jfetch<Asset[]>('/api/assets'),
  },
  ai: {
    chat: (message: string, history?: { role: string; content: string }[]) => jfetch<{ reply: string }>(`/api/ai/chat`, { method: 'POST', body: JSON.stringify({ message, history }) }),
    insights: () => jfetch<{ insights: string }>(`/api/ai/insights`),
    composeMessage: (data: { channel: string; topic: string; audience: string }) => jfetch<{ message: string; subject?: string }>(`/api/ai/compose`, { method: 'POST', body: JSON.stringify(data) }),
  },
}
