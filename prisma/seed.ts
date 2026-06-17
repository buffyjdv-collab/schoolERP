// Seed script: populates ERP with realistic master + transactional data
// Run: bun run seed  (or) bun prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const firstNames = ['Aarav','Vivaan','Aditya','Vihaan','Arjun','Sai','Reyansh','Krishna','Ishaan','Shaurya','Ananya','Diya','Saanvi','Aadhya','Pari','Myra','Anika','Navya','Kiara','Arya','Rahul','Rohit','Priya','Kavya','Neha','Tara','Karan','Amit','Pooja','Sneha','Dev','Yash','Mira','Riya','Tara','Ira','Zara','Nisha','Meera','Aryan']
const lastNames = ['Sharma','Verma','Gupta','Patel','Reddy','Nair','Iyer','Mehta','Joshi','Kapoor','Singh','Kumar','Rao','Das','Bose','Pillai','Menon','Chopra','Malhotra','Agarwal']
const subjectsList = ['English','Hindi','Mathematics','Science','Social Studies','Computer Science','Physics','Chemistry','Biology','Geography','History','Civics','Economics','Physical Education','Art','Music']
const teachersList = ['Mrs. Kavita Sharma','Mr. Rajesh Verma','Ms. Priya Patel','Mr. Sunil Reddy','Mrs. Lakshmi Nair','Mr. Anand Iyer','Ms. Sunita Mehta','Mr. Vikram Joshi','Mrs. Anjali Kapoor','Mr. Deepak Singh','Ms. Meera Rao','Mr. Arun Das']

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function pad(n: number, len: number) { return String(n).padStart(len, '0') }

async function main() {
  console.log('Seeding ERP database...')

  // Academic Year
  const ay = await db.academicYear.create({
    data: { name: '2026-27', startDate: new Date('2026-04-01'), endDate: new Date('2027-03-31'), isActive: true }
  })
  const ayPrev = await db.academicYear.create({
    data: { name: '2025-26', startDate: new Date('2025-04-01'), endDate: new Date('2026-03-31'), isActive: false }
  })

  // Classes + Sections + Subjects
  const classNames = ['Class 1','Class 2','Class 3','Class 4','Class 5','Class 6','Class 7','Class 8','Class 9','Class 10']
  const sectionNames = ['A','B','C']
  const classIds: string[] = []
  for (const cn of classNames) {
    const cls = await db.class.create({ data: { name: cn, academicYearId: ay.id } })
    classIds.push(cls.id)
    for (const sn of sectionNames) {
      await db.section.create({ data: { name: sn, classId: cls.id, capacity: 40, teacherId: rand(teachersList) } })
    }
    // subjects per class
    const subs = cn.startsWith('Class 9') || cn.startsWith('Class 10')
      ? ['English','Hindi','Mathematics','Physics','Chemistry','Biology','Social Studies','Computer Science']
      : ['English','Hindi','Mathematics','Science','Social Studies','Computer Science','Art','Physical Education']
    for (const s of subs) {
      await db.subject.create({ data: { name: s, code: s.slice(0,3).toUpperCase()+pad(randInt(1,99),2), classId: cls.id, teacherId: rand(teachersList) } })
    }
  }

  // Fee structures
  const feeTypes = [
    { name: 'Tuition Fee', amount: 24000, freq: 'Annual' },
    { name: 'Admission Fee', amount: 8000, freq: 'OneTime' },
    { name: 'Transport Fee', amount: 12000, freq: 'Annual' },
    { name: 'Library Fee', amount: 1500, freq: 'Annual' },
    { name: 'Examination Fee', amount: 2000, freq: 'Annual' },
    { name: 'Development Fee', amount: 5000, freq: 'Annual' },
  ]
  for (let i = 0; i < classIds.length; i++) {
    const cls = classIds[i]
    const multiplier = 1 + i * 0.1
    for (const ft of feeTypes) {
      await db.feeStructure.create({ data: { name: ft.name, classId: cls, amount: Math.round(ft.amount * multiplier), frequency: ft.freq, dueDate: new Date('2026-07-31') } })
    }
  }

  // Students
  const genders = ['Male','Female']
  const bloodGroups = ['A+','B+','O+','AB+','A-','B-','O-']
  let admissionCounter = 1001
  for (let ci = 0; ci < classIds.length; ci++) {
    const cls = classIds[ci]
    const sections = await db.section.findMany({ where: { classId: cls } })
    const studentCount = randInt(35, 55)
    for (let si = 0; si < studentCount; si++) {
      const sec = sections[si % sections.length]
      const fn = rand(firstNames)
      const ln = rand(lastNames)
      const gender = rand(genders)
      const year = 2026 - (ci + 1) - 4 // age ~5+ci
      const dob = new Date(year, randInt(0,11), randInt(1,28))
      const student = await db.student.create({
        data: {
          admissionNo: 'STU' + pad(admissionCounter++, 5),
          firstName: fn, lastName: ln, dob, gender,
          bloodGroup: rand(bloodGroups),
          religion: 'Hindu', nationality: 'Indian',
          address: `${randInt(1,200)}, MG Road, Bangalore`,
          phone: '+91' + pad(randInt(7000000000,9999999999),10),
          email: `${fn.toLowerCase()}.${ln.toLowerCase()}${randInt(1,99)}@email.com`,
          fatherName: `${rand(firstNames)} ${ln}`,
          motherName: `${rand(firstNames)} ${ln}`,
          guardianName: `${rand(firstNames)} ${ln}`,
          parentPhone: '+91' + pad(randInt(7000000000,9999999999),10),
          parentEmail: `parent.${ln.toLowerCase()}${randInt(1,99)}@email.com`,
          parentOccupation: rand(['Business','Service','Doctor','Engineer','Teacher','Farmer']),
          classId: cls, sectionId: sec.id, rollNo: si + 1,
          admissionDate: new Date(2026, randInt(0,5), randInt(1,28)),
          medicalInfo: Math.random() < 0.1 ? 'Asthma - carries inhaler' : null,
          status: 'Active',
        }
      })
      // Assign some transport
      if (Math.random() < 0.4) {
        await db.student.update({ where: { id: student.id }, data: { transportRouteId: `Route-${randInt(1,6)}` } })
      }
    }
  }
  console.log('Students created')

  // Attendance for last 30 days
  const students = await db.student.findMany()
  const today = new Date()
  for (let d = 0; d < 30; d++) {
    const date = new Date(today)
    date.setDate(today.getDate() - d)
    date.setHours(0, 0, 0, 0) // normalize to midnight for reliable date matching
    const day = date.getDay()
    if (day === 0) continue // skip Sunday
    for (const s of students) {
      const r = Math.random()
      let status = 'Present'
      if (r > 0.92) status = 'Absent'
      else if (r > 0.88) status = 'Late'
      else if (r > 0.86) status = 'Leave'
      await db.attendance.create({
        data: { studentId: s.id, date, status, method: Math.random() < 0.3 ? 'UHF' : 'Manual' }
      }).catch(() => {})
    }
  }
  console.log('Attendance created')

  // Fee invoices
  const feeStructures = await db.feeStructure.findMany()
  let invCounter = 100000
  for (const s of students) {
    const clsStructures = feeStructures.filter(f => f.classId === s.classId)
    for (const fs of clsStructures) {
      const r = Math.random()
      let status = 'Paid'
      let paidAmount = fs.amount
      let paymentDate: Date | null = new Date()
      if (r < 0.15) { status = 'Unpaid'; paidAmount = 0; paymentDate = null }
      else if (r < 0.25) { status = 'Partial'; paidAmount = fs.amount * 0.5 }
      else if (r < 0.32) { status = 'Overdue'; paidAmount = 0; paymentDate = null }
      await db.feeInvoice.create({
        data: {
          invoiceNo: 'INV' + pad(invCounter++, 6),
          studentId: s.id, feeStructureId: fs.id,
          amount: fs.amount, paidAmount,
          dueDate: new Date('2026-07-31'),
          status, paymentMethod: paymentDate ? rand(['Cash','Card','Online','UPI']) : null,
          paymentDate,
        }
      })
    }
  }
  console.log('Fee invoices created')

  // Exam + marks
  const exam = await db.exam.create({
    data: { name: 'Mid Term 2026-27', academicYearId: ay.id, examType: 'Mid Term', startDate: new Date('2026-09-01'), endDate: new Date('2026-09-10'), status: 'Completed' }
  })
  for (const cid of classIds) {
    await db.examClass.create({ data: { examId: exam.id, classId: cid } })
  }
  const grades = (p: number) => p >= 90 ? 'A+' : p >= 80 ? 'A' : p >= 70 ? 'B+' : p >= 60 ? 'B' : p >= 50 ? 'C' : p >= 40 ? 'D' : 'F'
  for (const s of students.slice(0, 200)) {
    if (!s.classId) continue
    const subs = await db.subject.findMany({ where: { classId: s.classId } })
    for (const sub of subs) {
      const max = 100
      const obtained = randInt(35, 99)
      await db.examMark.create({
        data: { examId: exam.id, studentId: s.id, subject: sub.name, maxMarks: max, obtained, grade: grades(obtained) }
      }).catch(() => {})
    }
  }
  console.log('Exam marks created')

  // Timetable
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const periods = [
    { start: '08:00', end: '08:45' },{ start: '08:45', end: '09:30' },{ start: '09:30', end: '10:15' },
    { start: '10:30', end: '11:15' },{ start: '11:15', end: '12:00' },{ start: '12:00', end: '12:45' },
    { start: '01:30', end: '02:15' },{ start: '02:15', end: '03:00' },
  ]
  for (const cid of classIds) {
    const subs = await db.subject.findMany({ where: { classId: cid } })
    const sections = await db.section.findMany({ where: { classId: cid } })
    for (const sec of sections) {
      for (const day of days) {
        for (let p = 0; p < periods.length; p++) {
          const sub = subs[(p + day.length) % subs.length]
          await db.timetableSlot.create({
            data: { classId: cid, sectionId: sec.id, day, period: p + 1, subjectName: sub.name, teacherName: sub.teacherId || rand(teachersList), room: `R-${randInt(101,120)}`, startTime: periods[p].start, endTime: periods[p].end }
          }).catch(() => {})
        }
      }
    }
  }
  console.log('Timetable created')

  // Vehicles + transport stops (Bangalore coords)
  const routes = [
    { name: 'Route 1 - North', stops: [['Hebbal',13.0358,77.5970],['Mekhri Circle',13.0310,77.5865],['Palace Guttahalli',13.0090,77.5830]] },
    { name: 'Route 2 - South', stops: [['Jayanagar',12.9250,77.5938],['JP Nagar',12.9050,77.5995],['BTM Layout',12.9166,77.6101]] },
    { name: 'Route 3 - East', stops: [['Indiranagar',12.9719,77.6412],['Koramangala',12.9352,77.6245],['HSR Layout',12.9116,77.6473]] },
    { name: 'Route 4 - West', stops: [['Rajajinagar',12.9921,77.5556],['Vijayanagar',12.9716,77.5360],['Basaveshwaranagar',12.9930,77.5430]] },
    { name: 'Route 5 - Central', stops: [['MG Road',12.9756,77.6056],['Brigade Road',12.9716,77.6058],['Residency Road',12.9650,77.6030]] },
    { name: 'Route 6 - Airport', stops: [['Hebbal',13.0358,77.5970],['BIAL',13.1986,77.7066],['Yelahanka',13.1007,77.5963]] },
  ]
  for (let i = 0; i < routes.length; i++) {
    const r = routes[i]
    const v = await db.vehicle.create({
      data: {
        vehicleNo: `KA01 AB ${pad(1000 + i, 4)}`, type: 'Bus', capacity: 45,
        driverName: `${rand(firstNames)} ${rand(lastNames)}`, driverPhone: '+91' + pad(randInt(7000000000,9999999999),10),
        routeName: r.name, gpsDeviceId: `GPS-${pad(i+1,3)}`,
        currentLat: r.stops[0][1] as number, currentLng: r.stops[0][2] as number,
        speed: 0, status: 'Idle', lastUpdate: new Date(),
      }
    })
    for (const stop of r.stops) {
      await db.transportStop.create({ data: { name: stop[0] as string, routeName: r.name, lat: stop[1] as number, lng: stop[2] as number, pickupTime: '07:0' + randInt(0,9), dropTime: '04:0' + randInt(0,9), fare: randInt(500,2000) } })
    }
    void v
  }
  console.log('Vehicles + stops created')

  // Library books
  const bookTitles = ['Wings of Fire','The Alchemist','Wuthering Heights','Pride and Prejudice','A Brief History of Time','The Selfish Gene','Sapiens','Atomic Habits','Thinking Fast and Slow','The Wright Brothers','Indian Polity','Indian Economy','Organic Chemistry','Concepts of Physics','Mathematics for Class 10','English Grammar in Use','The Discovery of India','Train to Pakistan','Midnight Children','The White Tiger']
  const authors = ['A.P.J Abdul Kalam','Paulo Coelho','Emily Bronte','Jane Austen','Stephen Hawking','Richard Dawkins','Yuval Noah Harari','James Clear','Daniel Kahneman','David McCullough','M. Laxmikanth','Ramesh Singh','Morrison Boyd','H.C. Verma','R.D. Sharma','Raymond Murphy','Jawaharlal Nehru','Khushwant Singh','Salman Rushdie','Aravind Adiga']
  const categories = ['Fiction','Science','Biography','Academic','History','Self Help','Reference']
  for (let i = 0; i < bookTitles.length; i++) {
    await db.book.create({
      data: { accessionNo: 'B' + pad(1000 + i, 5), title: bookTitles[i], author: authors[i], isbn: '978-' + pad(randInt(1000000000,9999999999),10), category: rand(categories), publisher: rand(['Penguin','Oxford','Cambridge','Pearson','McGraw Hill']), price: randInt(200,1500), totalCopies: randInt(3,10), available: randInt(1,8), rack: `R${randInt(1,20)}` }
    })
  }
  // Library issues
  const books = await db.book.findMany()
  for (let i = 0; i < 40; i++) {
    const s = rand(students)
    const b = rand(books)
    const issueDate = new Date(today.getTime() - randInt(1,30) * 86400000)
    const dueDate = new Date(issueDate.getTime() + 14 * 86400000)
    const returned = Math.random() < 0.5
    await db.libraryIssue.create({
      data: { bookId: b.id, studentId: s.id, issueDate, dueDate, returnDate: returned ? new Date() : null, fine: returned && today > dueDate ? randInt(10,50) : 0, status: returned ? 'Returned' : 'Issued' }
    }).catch(() => {})
  }
  console.log('Library created')

  // Employees
  const designations = ['Principal','Vice Principal','Senior Teacher','Teacher','Asst Teacher','Librarian','Accountant','Admin Officer','Lab Assistant','Peon','Driver','Security']
  const departments = ['Administration','Mathematics','Science','English','Social Science','Languages','Computer Science','Physical Education','Library','Accounts','Transport']
  for (let i = 0; i < 35; i++) {
    const fn = rand(firstNames); const ln = rand(lastNames)
    const des = i === 0 ? 'Principal' : rand(designations.slice(1))
    const baseSalary = des === 'Principal' ? 120000 : des === 'Vice Principal' ? 90000 : des === 'Senior Teacher' ? 60000 : des === 'Teacher' ? 45000 : randInt(20000,40000)
    await db.employee.create({
      data: { empCode: 'EMP' + pad(101 + i, 4), firstName: fn, lastName: ln, designation: des, department: rand(departments), gender: rand(genders), dob: new Date(1980 + randInt(0,25), randInt(0,11), randInt(1,28)), phone: '+91' + pad(randInt(7000000000,9999999999),10), email: `${fn.toLowerCase()}.${ln.toLowerCase()}@school.edu`, joiningDate: new Date(2015 + randInt(0,10), randInt(0,11), 1), salary: baseSalary, status: 'Active' }
    })
  }
  console.log('Employees created')

  // Leave requests
  const employees = await db.employee.findMany()
  const leaveTypes = ['Casual','Sick','Earned','Maternity']
  for (let i = 0; i < 20; i++) {
    const e = rand(employees)
    const start = new Date(today.getTime() - randInt(1,40) * 86400000)
    const end = new Date(start.getTime() + randInt(1,5) * 86400000)
    await db.leaveRequest.create({
      data: { employeeId: e.id, leaveType: rand(leaveTypes), startDate: start, endDate: end, reason: rand(['Personal work','Fever','Family function','Medical emergency','Relatives visit']), status: rand(['Pending','HODApproved','PrincipalApproved','Rejected']) }
    })
  }
  // Payroll for current month
  const month = '2026-06'
  for (const e of employees) {
    const basic = e.salary
    const allowances = basic * 0.2
    const deductions = basic * 0.1
    await db.payroll.create({ data: { employeeId: e.id, month, basicSalary: basic, allowances, deductions, netPay: basic + allowances - deductions, status: rand(['Processed','Paid','Pending']) } }).catch(() => {})
  }
  console.log('Leave + payroll created')

  // Assets
  const assetData = [
    ['Projector','EPSON-X06','Electronics','Smart Room 1',35000],
    ['Smart Board','SB-84','Electronics','Class 10A',45000],
    ['Computer','Dell-OptiPlex','Electronics','Computer Lab 1',40000],
    ['Microscope','Olympus-CX23','Lab Equipment','Bio Lab',18000],
    ['Lab Chemicals Set','Chem-2026','Lab Equipment','Chem Lab',12000],
    ['Bus','Volvo-9400','Vehicle','Parking',2500000],
    ['Generator','Cummins-125kVA','Infrastructure','Power Room',850000],
    ['Sports Kit','Cricket-Set','Sports','Store Room',15000],
  ]
  for (let i = 0; i < 25; i++) {
    const a = rand(assetData)
    await db.asset.create({ data: { assetCode: 'AST' + pad(101 + i, 4), name: a[0] as string, category: a[1] as string, location: a[2] as string, purchaseValue: a[4] as number, condition: rand(['Good','Good','Good','Damaged','Under Repair']), assignedTo: rand(employees).empCode } })
  }
  console.log('Assets created')

  // Certificates
  let certCounter = 10001
  for (let i = 0; i < 15; i++) {
    const s = rand(students)
    await db.certificate.create({ data: { studentId: s.id, type: rand(['Bonafide','Conduct','Study','Transfer']), certificateNo: 'CERT' + pad(certCounter++, 5), issuedBy: 'Principal Office' } }).catch(() => {})
  }

  // Notifications
  const notifTemplates = [
    { channel: 'SMS', category: 'Attendance', subject: null, message: 'Dear Parent, your child was marked ABSENT today.' },
    { channel: 'SMS', category: 'Fees', subject: null, message: 'Fee reminder: Rs.24000 due on 31 Jul 2026. Pay online.' },
    { channel: 'Email', category: 'Exam', subject: 'Mid Term Exam Schedule', message: 'Mid Term exams begin 1 Sep 2026. Check portal.' },
    { channel: 'WhatsApp', category: 'Transport', subject: null, message: 'Bus has reached school. Pickup time tomorrow 07:15 AM.' },
    { channel: 'Push', category: 'General', subject: 'Holiday Notice', message: 'School closed tomorrow on account of regional holiday.' },
  ]
  for (let i = 0; i < 50; i++) {
    const n = rand(notifTemplates)
    await db.notification.create({ data: { channel: n.channel, recipient: '+91' + pad(randInt(7000000000,9999999999),10), subject: n.subject, message: n.message, category: n.category, status: rand(['Sent','Sent','Queued','Failed']) } })
  }

  // Admission enquiries + applications
  for (let i = 0; i < 20; i++) {
    const fn = rand(firstNames); const ln = rand(lastNames)
    await db.admissionEnquiry.create({
      data: { studentName: `${fn} ${ln}`, parentName: `${rand(firstNames)} ${ln}`, phone: '+91' + pad(randInt(7000000000,9999999999),10), email: `enquiry${i}@email.com`, classApplied: rand(classNames), source: rand(['Website','Walk-in','Referral','Newspaper']), status: rand(['Enquiry','Application','Test','Interview','Approved','Rejected']) }
    })
  }
  for (let i = 0; i < 12; i++) {
    const fn = rand(firstNames); const ln = rand(lastNames)
    await db.application.create({
      data: { studentName: `${fn} ${ln}`, parentName: `${rand(firstNames)} ${ln}`, phone: '+91' + pad(randInt(7000000000,9999999999),10), email: `app${i}@email.com`, dob: new Date(2018 + randInt(0,5), randInt(0,11), randInt(1,28)), gender: rand(genders), address: `${randInt(1,200)}, Brigade Road, Bangalore`, classApplied: rand(classNames), previousSchool: Math.random() < 0.5 ? 'Greenwood Public' : null, status: rand(['Submitted','Verified','TestScheduled','Interview','Approved','Rejected']) }
    })
  }

  console.log('Seed complete!')
  console.log(`Students: ${await db.student.count()}`)
  console.log(`Employees: ${await db.employee.count()}`)
  console.log(`Attendance: ${await db.attendance.count()}`)
  console.log(`Fee Invoices: ${await db.feeInvoice.count()}`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
