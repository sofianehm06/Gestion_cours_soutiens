// Types partagés entre le processus principal (Electron) et l'interface (React).

export type PaymentStatus = "paid" | "pending" | "late";

/** Jour du mois après lequel un mois non payé est considéré en retard. */
export const PAYMENT_DUE_DAY = 10;

export interface Group {
  id: number;
  name: string;
  level: string;
  monthly_price: number;
  created_at: string;
  /** Nombre d'élèves actifs inscrits dans le groupe. */
  student_count: number;
}

export interface GroupInput {
  name: string;
  level: string;
  monthly_price: number;
}

export interface StudentGroupLink {
  group_id: number;
  group_name: string;
  level: string;
  custom_price: number | null;
  /** Tarif appliqué : tarif personnalisé s'il existe, sinon tarif du groupe. */
  price: number;
}

export interface Student {
  id: number;
  first_name: string;
  last_name: string;
  parent_phone: string;
  enrolled_at: string;
  is_active: boolean;
  groups: StudentGroupLink[];
}

export interface StudentInput {
  first_name: string;
  last_name: string;
  parent_phone: string;
  enrolled_at: string;
  is_active: boolean;
  groups: { group_id: number; custom_price: number | null }[];
}

export interface StudentFilter {
  groupId?: number | null;
  status?: "active" | "inactive" | "all";
  search?: string;
}

export interface AttendanceEntry {
  student_id: number;
  first_name: string;
  last_name: string;
  /** null quand la séance n'a pas encore été enregistrée pour cet élève. */
  present: boolean | null;
}

export interface AttendanceSession {
  date: string;
  present: number;
  absent: number;
  absentees: string[];
}

export interface StudentAttendanceRecord {
  date: string;
  group_id: number;
  group_name: string;
  present: boolean;
}

export interface MonthlyPaymentRow {
  student_id: number;
  first_name: string;
  last_name: string;
  parent_phone: string;
  amount_due: number;
  status: PaymentStatus;
  payment_id: number | null;
  amount_paid: number | null;
  paid_at: string | null;
}

export interface PaymentInput {
  student_id: number;
  group_id: number;
  year: number;
  month: number;
  amount: number;
  paid_at: string;
}

export interface StudentPaymentRecord {
  id: number;
  group_id: number;
  group_name: string;
  year: number;
  month: number;
  amount: number;
  paid_at: string;
}

export interface LateStudent {
  student_id: number;
  first_name: string;
  last_name: string;
  parent_phone: string;
  group_id: number;
  group_name: string;
  /** Mois impayés en retard, du plus ancien au plus récent. */
  months: { year: number; month: number }[];
  amount_owed: number;
}

export interface DashboardData {
  year: number;
  month: number;
  active_students: number;
  expected_revenue: number;
  collected_revenue: number;
  group_count: number;
  late_students: LateStudent[];
}

/** API exposée par le preload sur `window.api`. */
export interface SoutienProApi {
  getDashboard(): Promise<DashboardData>;

  listGroups(): Promise<Group[]>;
  createGroup(input: GroupInput): Promise<number>;
  updateGroup(id: number, input: GroupInput): Promise<void>;
  deleteGroup(id: number): Promise<void>;

  listStudents(filter: StudentFilter): Promise<Student[]>;
  createStudent(input: StudentInput): Promise<number>;
  updateStudent(id: number, input: StudentInput): Promise<void>;
  setStudentActive(id: number, active: boolean): Promise<void>;
  deleteStudent(id: number): Promise<void>;

  getAttendance(groupId: number, date: string): Promise<AttendanceEntry[]>;
  saveAttendance(groupId: number, date: string, entries: { student_id: number; present: boolean }[]): Promise<void>;
  listGroupSessions(groupId: number): Promise<AttendanceSession[]>;
  listStudentAttendance(studentId: number): Promise<StudentAttendanceRecord[]>;

  getMonthlyPayments(groupId: number, year: number, month: number): Promise<MonthlyPaymentRow[]>;
  recordPayment(input: PaymentInput): Promise<void>;
  cancelPayment(paymentId: number): Promise<void>;
  listStudentPayments(studentId: number): Promise<StudentPaymentRecord[]>;
}
