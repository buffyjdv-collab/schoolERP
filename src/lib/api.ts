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
    update: (id: string, data: any) => jfetch<Student>(`/api/students/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => jfetch<any>(`/api/students/${id}`, { method: 'DELETE' }),
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
    createClass: (data: any) => jfetch<any>('/api/academics/classes', { method: 'POST', body: JSON.stringify(data) }),
    updateClass: (id: string, data: any) => jfetch<any>(`/api/academics/classes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteClass: (id: string) => jfetch<any>(`/api/academics/classes/${id}`, { method: 'DELETE' }),
    addSection: (classId: string, data: any) => jfetch<any>(`/api/academics/classes/${classId}/sections`, { method: 'POST', body: JSON.stringify(data) }),
    addSubject: (classId: string, data: any) => jfetch<any>(`/api/academics/classes/${classId}/subjects`, { method: 'POST', body: JSON.stringify(data) }),
    timetable: (classId: string, sectionId?: string) => {
      const s = new URLSearchParams({ classId, ...(sectionId ? { sectionId } : {}) }).toString()
      return jfetch<TimetableSlot[]>(`/api/academics/timetable?${s}`)
    },
    addSlot: (data: any) => jfetch<any>('/api/academics/timetable', { method: 'POST', body: JSON.stringify(data) }),
    updateSlot: (id: string, data: any) => jfetch<any>(`/api/academics/timetable/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteSlot: (id: string) => jfetch<any>(`/api/academics/timetable/${id}`, { method: 'DELETE' }),
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
    createStructure: (data: any) => jfetch<any>('/api/fees/structures', { method: 'POST', body: JSON.stringify(data) }),
    updateStructure: (id: string, data: any) => jfetch<any>(`/api/fees/structures/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteStructure: (id: string) => jfetch<any>(`/api/fees/structures/${id}`, { method: 'DELETE' }),
    createInvoice: (data: { studentId: string; feeStructureId: string }) => jfetch<any>('/api/fees/invoices/create', { method: 'POST', body: JSON.stringify(data) }),
    deleteInvoice: (id: string) => jfetch<any>(`/api/fees/invoices/${id}`, { method: 'DELETE' }),
    summary: () => jfetch<{ collected: number; pending: number; defaulters: number; byStatus: { label: string; value: number }[]; byMethod: { label: string; value: number }[] }>('/api/fees/summary'),
    collect: (id: string, data: { paidAmount: number; paymentMethod: string }) => jfetch<FeeInvoice>(`/api/fees/invoices/${id}/pay`, { method: 'POST', body: JSON.stringify(data) }),
  },
  exams: {
    list: () => jfetch<Exam[]>('/api/exams'),
    create: (data: any) => jfetch<Exam>('/api/exams', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => jfetch<Exam>(`/api/exams/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => jfetch<any>(`/api/exams/${id}`, { method: 'DELETE' }),
    marks: (examId: string, classId?: string) => {
      const s = new URLSearchParams({ examId, ...(classId ? { classId } : {}) }).toString()
      return jfetch<ExamMark[]>(`/api/exams/marks?${s}`)
    },
    enterMarks: (data: any) => jfetch<any>('/api/exams/marks/enter', { method: 'POST', body: JSON.stringify(data) }),
    deleteMarks: (id: string) => jfetch<any>(`/api/exams/marks/${id}`, { method: 'DELETE' }),
  },
  transport: {
    vehicles: () => jfetch<Vehicle[]>('/api/transport/vehicles'),
    createVehicle: (data: any) => jfetch<any>('/api/transport/vehicles', { method: 'POST', body: JSON.stringify(data) }),
    updateVehicle: (id: string, data: any) => jfetch<any>(`/api/transport/vehicles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteVehicle: (id: string) => jfetch<any>(`/api/transport/vehicles/${id}`, { method: 'DELETE' }),
    stops: () => jfetch<{ id: string; name: string; routeName: string; lat: number; lng: number; pickupTime: string; dropTime: string; fare: number }[]>('/api/transport/stops'),
    createStop: (data: any) => jfetch<any>('/api/transport/stops', { method: 'POST', body: JSON.stringify(data) }),
    updateStop: (id: string, data: any) => jfetch<any>(`/api/transport/stops/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteStop: (id: string) => jfetch<any>(`/api/transport/stops/${id}`, { method: 'DELETE' }),
  },
  library: {
    createBook: (data: any) => jfetch<any>('/api/library/books', { method: 'POST', body: JSON.stringify(data) }),
    updateBook: (id: string, data: any) => jfetch<any>(`/api/library/books/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteBook: (id: string) => jfetch<any>(`/api/library/books/${id}`, { method: 'DELETE' }),
    books: (q?: string) => jfetch<Book[]>(`/api/library/books${q ? '?q=' + q : ''}`),
    issues: () => jfetch<LibraryIssue[]>('/api/library/issues'),
    issue: (data: { bookId: string; studentId: string }) => jfetch<LibraryIssue>('/api/library/issues', { method: 'POST', body: JSON.stringify(data) }),
    return: (id: string) => jfetch<LibraryIssue>(`/api/library/issues/${id}/return`, { method: 'POST' }),
  },
  hr: {
    employees: () => jfetch<Employee[]>('/api/hr/employees'),
    createEmployee: (data: any) => jfetch<Employee>('/api/hr/employees', { method: 'POST', body: JSON.stringify(data) }),
    updateEmployee: (id: string, data: any) => jfetch<Employee>(`/api/hr/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteEmployee: (id: string) => jfetch<any>(`/api/hr/employees/${id}`, { method: 'DELETE' }),
    leaves: () => jfetch<LeaveRequest[]>('/api/hr/leaves'),
    approveLeave: (id: string, status: string) => jfetch<LeaveRequest>(`/api/hr/leaves/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    payroll: (month?: string) => jfetch<Payroll[]>(`/api/hr/payroll${month ? '?month=' + month : ''}`),
    runPayroll: (month: string) => jfetch<any>(`/api/hr/payroll/run`, { method: 'POST', body: JSON.stringify({ month }) }),
  },
  communication: {
    list: () => jfetch<Notification[]>('/api/communication/notifications'),
    send: (data: { channel: string; recipient: string; subject?: string; message: string; category: string }) => jfetch<Notification>('/api/communication/send', { method: 'POST', body: JSON.stringify(data) }),
    remove: (id: string) => jfetch<any>(`/api/communication/notifications/${id}`, { method: 'DELETE' }),
  },
  assets: {
    list: () => jfetch<Asset[]>('/api/assets'),
    create: (data: any) => jfetch<Asset>('/api/assets', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => jfetch<Asset>(`/api/assets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => jfetch<any>(`/api/assets/${id}`, { method: 'DELETE' }),
  },
  ai: {
    chat: (message: string, history?: { role: string; content: string }[]) => jfetch<{ reply: string }>(`/api/ai/chat`, { method: 'POST', body: JSON.stringify({ message, history }) }),
    insights: () => jfetch<{ insights: string }>(`/api/ai/insights`),
    composeMessage: (data: { channel: string; topic: string; audience: string }) => jfetch<{ message: string; subject?: string }>(`/api/ai/compose`, { method: 'POST', body: JSON.stringify(data) }),
  },
}
