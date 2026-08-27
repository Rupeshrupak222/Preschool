// ============================================================
// Demo data for Guest Mode — used across all portals.
// This is sample/dummy content shown to guest users so they can
// preview features without touching real database records.
// ============================================================

const demoStudents = [
  { id: "demo_s1", name: "Aarav Sharma", email: "aarav@demo.school", phone: "9000000001", classLevel: "Class 5", schoolName: "Demo School", signupSource: "web", status: "active", createdAt: "2026-01-10" },
  { id: "demo_s2", name: "Diya Patel", email: "diya@demo.school", phone: "9000000002", classLevel: "Class 5", schoolName: "Demo School", signupSource: "web", status: "active", createdAt: "2026-01-12" },
  { id: "demo_s3", name: "Kabir Singh", email: "kabir@demo.school", phone: "9000000003", classLevel: "Class 6", schoolName: "Demo School", signupSource: "web", status: "active", createdAt: "2026-01-15" },
  { id: "demo_s4", name: "Anaya Reddy", email: "anaya@demo.school", phone: "9000000004", classLevel: "Class 6", schoolName: "Demo School", signupSource: "web", status: "active", createdAt: "2026-01-18" },
  { id: "demo_s5", name: "Vivaan Gupta", email: "vivaan@demo.school", phone: "9000000005", classLevel: "Class 7", schoolName: "Demo School", signupSource: "web", status: "active", createdAt: "2026-01-20" },
];

const demoDoubts = [
  { id: "demo_d1", studentEmail: "aarav@demo.school", studentName: "Aarav Sharma", classLevel: "Class 5", subject: "Mathematics", question: "How do I solve BODMAS problems?", attachmentName: null, attachmentType: null, status: "pending", replyText: null, createdAt: "2026-02-01", repliedAt: null },
  { id: "demo_d2", studentEmail: "diya@demo.school", studentName: "Diya Patel", classLevel: "Class 5", subject: "Science", question: "What is the water cycle?", attachmentName: null, attachmentType: null, status: "solved", replyText: "The water cycle is evaporation, condensation, and precipitation.", createdAt: "2026-01-28", repliedAt: "2026-01-29" },
];

const demoHomework = [
  { id: "demo_hw1", teacherId: "guest_teacher", classLevel: "Class 5", studentEmail: null, subject: "Mathematics", title: "Fractions Worksheet", description: "Complete exercises 1-10", dueDate: "2026-03-05", priority: "medium", status: "active", teacherName: "Guest User", createdAt: "2026-02-25" },
  { id: "demo_hw2", teacherId: "guest_teacher", classLevel: "Class 6", studentEmail: null, subject: "Science", title: "Plant Life Diagram", description: "Draw and label a plant", dueDate: "2026-03-08", priority: "low", status: "active", teacherName: "Guest User", createdAt: "2026-02-26" },
];

const demoNotes = [
  { id: "demo_n1", teacherId: "guest_teacher", classLevel: "Class 5", subject: "Mathematics", title: "BODMAS Basics", fileName: "bodmas.pdf", fileSize: "1.2 MB", createdAt: "2026-02-20" },
  { id: "demo_n2", teacherId: "guest_teacher", classLevel: "Class 6", subject: "Science", title: "Water Cycle Notes", fileName: "water-cycle.pdf", fileSize: "0.9 MB", createdAt: "2026-02-22" },
];

export const guestTeacherDashboard = {
  teacher: {
    id: "guest_teacher",
    name: "Guest User",
    email: "guest@guest.adyapan.local",
    schoolId: "demo_school",
    schoolName: "Demo School",
    subject: "Mathematics",
    phone: null,
    assignedClasses: ["Class 5", "Class 6", "Class 7"],
    lastLoginAt: null
  },
  stats: {
    students: demoStudents.length,
    classes: 3,
    upcomingClasses: 2,
    certificates: 0,
    activeLogins: 4,
    homework: demoHomework.length,
    notes: demoNotes.length,
    pendingDoubts: demoDoubts.filter((d) => d.status !== "solved").length,
    notifications: 0
  },
  classBreakdown: [
    { classLevel: "Class 5", total: 2 },
    { classLevel: "Class 6", total: 2 },
    { classLevel: "Class 7", total: 1 }
  ],
  students: demoStudents,
  schedule: [
    { id: "demo_sc1", title: "Maths Live Class", classLevel: "Class 5", subject: "Mathematics", startTime: "2026-03-01T10:00:00", endTime: "2026-03-01T11:00:00", room: "Room 1", mode: "online", status: "scheduled" }
  ],
  homework: demoHomework,
  notes: demoNotes,
  doubts: demoDoubts,
  notifications: []
};

export const guestPrincipalDashboard = {
  principal: {
    id: "guest_principal",
    name: "Guest User",
    email: "guest@guest.adyapan.local",
    schoolId: "demo_school",
    schoolName: "Demo School",
    phone: null,
    lastLoginAt: null
  },
  stats: {
    students: demoStudents.length,
    leads: 3,
    activeLogins: 4,
    payments: 2
  },
  students: demoStudents,
  leads: [
    { id: "demo_l1", type: "demo", name: "Rohan Mehta", email: "rohan@parent.demo", phone: "9111111111", school: "Demo School", city: "Mumbai", message: "Interested in enrollment", interest: "Class 5", createdAt: "2026-02-10" },
    { id: "demo_l2", type: "school", name: "Sneha Iyer", email: "sneha@parent.demo", phone: "9222222222", school: "Demo School", city: "Pune", message: "Demo request", interest: "Class 6", createdAt: "2026-02-12" }
  ],
  logins: [
    { id: "demo_le1", email: "aarav@demo.school", status: "success", createdAt: "2026-02-28" },
    { id: "demo_le2", email: "diya@demo.school", status: "success", createdAt: "2026-02-27" }
  ]
};

export const guestAdminOverview = {
  totals: {
    schools: 1,
    students: demoStudents.length,
    teachers: 3,
    principals: 1,
    connections: 5,
    revenue: 45000,
    certificates: 8
  },
  schools: [
    { id: "demo_school", name: "Demo School", students: demoStudents.length, teachers: 3, status: "active" }
  ],
  teachers: [
    { id: "demo_t1", teacher_name: "Guest User", email: "guest@guest.adyapan.local", school_name: "Demo School", subject: "Mathematics" }
  ],
  teacherPerformance: [
    { name: "Guest User", school: "Demo School", students: 5, homework: 2, notes: 2 }
  ],
  principals: [
    { id: "demo_p1", principal_name: "Guest User", email: "guest@guest.adyapan.local", school_name: "Demo School" }
  ],
  students: demoStudents.map((s) => ({ ...s, school_name: s.schoolName })),
  payments: [
    { id: "demo_pay1", user_email: "aarav@demo.school", plan: "Future Skills Starter", amount: 22500, status: "paid", created_at: "2026-02-15" },
    { id: "demo_pay2", user_email: "kabir@demo.school", plan: "Future Skills Pro", amount: 22500, status: "paid", created_at: "2026-02-18" }
  ],
  loginEvents: [
    { id: "demo_ev1", email: "aarav@demo.school", role: "student", status: "success", created_at: "2026-02-28" }
  ],
  teacherLoginEvents: []
};
