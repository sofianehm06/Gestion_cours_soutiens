import type { Db } from "./database";
import { isoDate, monthEnd, unpaidStatus } from "../shared/payments";
import type {
  AttendanceEntry,
  AttendanceSession,
  DashboardData,
  Group,
  GroupInput,
  LateStudent,
  MonthlyPaymentRow,
  PaymentInput,
  SoutienProApi,
  Student,
  StudentAttendanceRecord,
  StudentFilter,
  StudentGroupLink,
  StudentInput,
  StudentPaymentRecord,
} from "../shared/types";

type Methods = { [K in keyof SoutienProApi]: (...args: Parameters<SoutienProApi[K]>) => Awaited<ReturnType<SoutienProApi[K]>> };

interface StudentRow {
  id: number;
  first_name: string;
  last_name: string;
  parent_phone: string;
  enrolled_at: string;
  is_active: number;
}

function cleanText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function requireText(value: string, field: string): string {
  const text = cleanText(value ?? "");
  if (!text) throw new Error(`Le champ « ${field} » est obligatoire.`);
  return text;
}

function requireAmount(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Le champ « ${field} » doit être un montant positif.`);
  return Math.round(value);
}

/**
 * Toutes les opérations métier sur la base.
 * `now` est injectable pour pouvoir tester les calculs de retard.
 */
export function createRepository(db: Db, now: () => Date = () => new Date()): Methods {
  const groupLinksStmt = db.prepare(`
    SELECT sg.student_id, sg.group_id, g.name AS group_name, g.level, sg.custom_price,
           COALESCE(sg.custom_price, g.monthly_price) AS price
    FROM student_groups sg JOIN groups g ON g.id = sg.group_id
    ORDER BY g.name COLLATE NOCASE
  `);

  function linksByStudent(): Map<number, StudentGroupLink[]> {
    const map = new Map<number, StudentGroupLink[]>();
    for (const row of groupLinksStmt.all() as (StudentGroupLink & { student_id: number })[]) {
      const { student_id, ...link } = row;
      if (!map.has(student_id)) map.set(student_id, []);
      map.get(student_id)!.push(link);
    }
    return map;
  }

  function toStudent(row: StudentRow, links: Map<number, StudentGroupLink[]>): Student {
    return { ...row, is_active: row.is_active === 1, groups: links.get(row.id) ?? [] };
  }

  function validateStudent(input: StudentInput) {
    const groupIds = new Set<number>();
    const groups = input.groups.filter((g) => {
      if (groupIds.has(g.group_id)) return false;
      groupIds.add(g.group_id);
      return true;
    });
    return {
      first_name: requireText(input.first_name, "Prénom"),
      last_name: requireText(input.last_name, "Nom"),
      parent_phone: cleanText(input.parent_phone ?? ""),
      enrolled_at: input.enrolled_at || isoDate(now()),
      is_active: input.is_active ? 1 : 0,
      groups: groups.map((g) => ({
        group_id: g.group_id,
        custom_price: g.custom_price == null ? null : requireAmount(g.custom_price, "Tarif personnalisé"),
      })),
    };
  }

  const insertLink = db.prepare("INSERT INTO student_groups (student_id, group_id, custom_price) VALUES (?, ?, ?)");

  function syncLinks(studentId: number, groups: { group_id: number; custom_price: number | null }[]) {
    const keep = groups.map((g) => g.group_id);
    db.prepare(
      `DELETE FROM student_groups WHERE student_id = ? AND group_id NOT IN (${keep.map(() => "?").join(",") || "NULL"})`,
    ).run(studentId, ...keep);
    const update = db.prepare("UPDATE student_groups SET custom_price = ? WHERE student_id = ? AND group_id = ?");
    for (const g of groups) {
      if (update.run(g.custom_price, studentId, g.group_id).changes === 0) {
        insertLink.run(studentId, g.group_id, g.custom_price);
      }
    }
  }

  /** Élèves d'un groupe dont la facturation concerne le mois donné. */
  function monthlyRows(groupId: number, year: number, month: number): MonthlyPaymentRow[] {
    const rows = db
      .prepare(
        `SELECT s.id AS student_id, s.first_name, s.last_name, s.parent_phone,
                COALESCE(sg.custom_price, g.monthly_price) AS amount_due,
                p.id AS payment_id, p.amount AS amount_paid, p.paid_at
         FROM student_groups sg
         JOIN students s ON s.id = sg.student_id
         JOIN groups g ON g.id = sg.group_id
         LEFT JOIN payments p ON p.student_id = s.id AND p.group_id = g.id
                             AND p.year = ? AND p.month = ? AND p.status = 'paid'
         WHERE sg.group_id = ? AND s.enrolled_at <= ? AND (s.is_active = 1 OR p.id IS NOT NULL)
         ORDER BY s.last_name COLLATE NOCASE, s.first_name COLLATE NOCASE`,
      )
      .all(year, month, groupId, monthEnd(year, month)) as Omit<MonthlyPaymentRow, "status">[];
    const today = now();
    return rows.map((r) => ({ ...r, status: r.payment_id ? "paid" : unpaidStatus(year, month, today) }));
  }

  return {
    // ---------- Tableau de bord ----------
    getDashboard(): DashboardData {
      const today = now();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;

      const activeStudents = (db.prepare("SELECT COUNT(*) AS n FROM students WHERE is_active = 1").get() as { n: number }).n;
      const groupCount = (db.prepare("SELECT COUNT(*) AS n FROM groups").get() as { n: number }).n;
      const expected = (
        db
          .prepare(
            `SELECT COALESCE(SUM(COALESCE(sg.custom_price, g.monthly_price)), 0) AS total
             FROM student_groups sg
             JOIN students s ON s.id = sg.student_id AND s.is_active = 1
             JOIN groups g ON g.id = sg.group_id`,
          )
          .get() as { total: number }
      ).total;
      const collected = (
        db
          .prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'paid' AND year = ? AND month = ?")
          .get(year, month) as { total: number }
      ).total;

      const enrollments = db
        .prepare(
          `SELECT s.id AS student_id, s.first_name, s.last_name, s.parent_phone, s.enrolled_at,
                  g.id AS group_id, g.name AS group_name,
                  COALESCE(sg.custom_price, g.monthly_price) AS price
           FROM student_groups sg
           JOIN students s ON s.id = sg.student_id AND s.is_active = 1
           JOIN groups g ON g.id = sg.group_id
           ORDER BY s.last_name COLLATE NOCASE, s.first_name COLLATE NOCASE`,
        )
        .all() as (Omit<LateStudent, "months" | "amount_owed"> & { enrolled_at: string; price: number })[];
      const paid = new Set(
        (db.prepare("SELECT student_id, group_id, year, month FROM payments WHERE status = 'paid'").all() as {
          student_id: number;
          group_id: number;
          year: number;
          month: number;
        }[]).map((p) => `${p.student_id}:${p.group_id}:${p.year}:${p.month}`),
      );

      const lateStudents: LateStudent[] = [];
      for (const e of enrollments) {
        const [startYear, startMonth] = e.enrolled_at.split("-").map(Number);
        const months: { year: number; month: number }[] = [];
        let y = startYear;
        let m = startMonth;
        while (y < year || (y === year && m <= month)) {
          if (!paid.has(`${e.student_id}:${e.group_id}:${y}:${m}`) && unpaidStatus(y, m, today) === "late") {
            months.push({ year: y, month: m });
          }
          m++;
          if (m > 12) {
            m = 1;
            y++;
          }
        }
        if (months.length > 0) {
          const { enrolled_at: _enrolled, price, ...rest } = e;
          lateStudents.push({ ...rest, months, amount_owed: months.length * price });
        }
      }
      lateStudents.sort((a, b) => b.months.length - a.months.length);

      return {
        year,
        month,
        active_students: activeStudents,
        expected_revenue: expected,
        collected_revenue: collected,
        group_count: groupCount,
        late_students: lateStudents,
      };
    },

    // ---------- Groupes ----------
    listGroups(): Group[] {
      return db
        .prepare(
          `SELECT g.*, (SELECT COUNT(*) FROM student_groups sg JOIN students s ON s.id = sg.student_id
                        WHERE sg.group_id = g.id AND s.is_active = 1) AS student_count
           FROM groups g ORDER BY g.name COLLATE NOCASE`,
        )
        .all() as Group[];
    },

    createGroup(input: GroupInput): number {
      const result = db
        .prepare("INSERT INTO groups (name, level, monthly_price) VALUES (?, ?, ?)")
        .run(requireText(input.name, "Nom du groupe"), cleanText(input.level ?? ""), requireAmount(input.monthly_price, "Tarif mensuel"));
      return Number(result.lastInsertRowid);
    },

    updateGroup(id: number, input: GroupInput) {
      db.prepare("UPDATE groups SET name = ?, level = ?, monthly_price = ? WHERE id = ?").run(
        requireText(input.name, "Nom du groupe"),
        cleanText(input.level ?? ""),
        requireAmount(input.monthly_price, "Tarif mensuel"),
        id,
      );
    },

    deleteGroup(id: number) {
      db.prepare("DELETE FROM groups WHERE id = ?").run(id);
    },

    // ---------- Élèves ----------
    listStudents(filter: StudentFilter): Student[] {
      const where: string[] = [];
      const params: (string | number)[] = [];
      if (filter.groupId) {
        where.push("s.id IN (SELECT student_id FROM student_groups WHERE group_id = ?)");
        params.push(filter.groupId);
      }
      if (filter.status === "active") where.push("s.is_active = 1");
      if (filter.status === "inactive") where.push("s.is_active = 0");
      const search = cleanText(filter.search ?? "");
      if (search) {
        where.push("(s.first_name || ' ' || s.last_name LIKE ? OR s.last_name || ' ' || s.first_name LIKE ? OR s.parent_phone LIKE ?)");
        const like = `%${search}%`;
        params.push(like, like, like);
      }
      const rows = db
        .prepare(
          `SELECT s.* FROM students s ${where.length ? "WHERE " + where.join(" AND ") : ""}
           ORDER BY s.is_active DESC, s.last_name COLLATE NOCASE, s.first_name COLLATE NOCASE`,
        )
        .all(...params) as StudentRow[];
      const links = linksByStudent();
      return rows.map((r) => toStudent(r, links));
    },

    createStudent(input: StudentInput): number {
      const s = validateStudent(input);
      return db.transaction(() => {
        const result = db
          .prepare("INSERT INTO students (first_name, last_name, parent_phone, enrolled_at, is_active) VALUES (?, ?, ?, ?, ?)")
          .run(s.first_name, s.last_name, s.parent_phone, s.enrolled_at, s.is_active);
        const id = Number(result.lastInsertRowid);
        syncLinks(id, s.groups);
        return id;
      })();
    },

    updateStudent(id: number, input: StudentInput) {
      const s = validateStudent(input);
      db.transaction(() => {
        db.prepare("UPDATE students SET first_name = ?, last_name = ?, parent_phone = ?, enrolled_at = ?, is_active = ? WHERE id = ?").run(
          s.first_name,
          s.last_name,
          s.parent_phone,
          s.enrolled_at,
          s.is_active,
          id,
        );
        syncLinks(id, s.groups);
      })();
    },

    setStudentActive(id: number, active: boolean) {
      db.prepare("UPDATE students SET is_active = ? WHERE id = ?").run(active ? 1 : 0, id);
    },

    deleteStudent(id: number) {
      db.prepare("DELETE FROM students WHERE id = ?").run(id);
    },

    // ---------- Présences ----------
    getAttendance(groupId: number, date: string): AttendanceEntry[] {
      const rows = db
        .prepare(
          `SELECT s.id AS student_id, s.first_name, s.last_name, a.present
           FROM students s
           LEFT JOIN student_groups sg ON sg.student_id = s.id AND sg.group_id = ?
           LEFT JOIN attendance a ON a.student_id = s.id AND a.group_id = ? AND a.date = ?
           WHERE (sg.id IS NOT NULL AND s.is_active = 1) OR a.id IS NOT NULL
           ORDER BY s.last_name COLLATE NOCASE, s.first_name COLLATE NOCASE`,
        )
        .all(groupId, groupId, date) as (Omit<AttendanceEntry, "present"> & { present: number | null })[];
      return rows.map((r) => ({ ...r, present: r.present == null ? null : r.present === 1 }));
    },

    saveAttendance(groupId: number, date: string, entries: { student_id: number; present: boolean }[]) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Date invalide.");
      const upsert = db.prepare(
        `INSERT INTO attendance (student_id, group_id, date, present) VALUES (?, ?, ?, ?)
         ON CONFLICT (student_id, group_id, date) DO UPDATE SET present = excluded.present`,
      );
      db.transaction(() => {
        for (const e of entries) upsert.run(e.student_id, groupId, date, e.present ? 1 : 0);
      })();
    },

    listGroupSessions(groupId: number): AttendanceSession[] {
      const rows = db
        .prepare(
          `SELECT a.date, a.present, s.first_name, s.last_name
           FROM attendance a JOIN students s ON s.id = a.student_id
           WHERE a.group_id = ?
           ORDER BY a.date DESC, s.last_name COLLATE NOCASE, s.first_name COLLATE NOCASE`,
        )
        .all(groupId) as { date: string; present: number; first_name: string; last_name: string }[];
      const sessions: AttendanceSession[] = [];
      for (const r of rows) {
        let session = sessions[sessions.length - 1];
        if (!session || session.date !== r.date) {
          session = { date: r.date, present: 0, absent: 0, absentees: [] };
          sessions.push(session);
        }
        if (r.present) session.present++;
        else {
          session.absent++;
          session.absentees.push(`${r.last_name} ${r.first_name}`);
        }
      }
      return sessions;
    },

    listStudentAttendance(studentId: number): StudentAttendanceRecord[] {
      const rows = db
        .prepare(
          `SELECT a.date, a.group_id, g.name AS group_name, a.present
           FROM attendance a JOIN groups g ON g.id = a.group_id
           WHERE a.student_id = ? ORDER BY a.date DESC, g.name COLLATE NOCASE`,
        )
        .all(studentId) as (Omit<StudentAttendanceRecord, "present"> & { present: number })[];
      return rows.map((r) => ({ ...r, present: r.present === 1 }));
    },

    // ---------- Paiements ----------
    getMonthlyPayments(groupId: number, year: number, month: number): MonthlyPaymentRow[] {
      return monthlyRows(groupId, year, month);
    },

    recordPayment(input: PaymentInput) {
      if (input.month < 1 || input.month > 12) throw new Error("Mois invalide.");
      db.prepare(
        `INSERT INTO payments (student_id, group_id, month, year, amount, paid_at, status)
         VALUES (?, ?, ?, ?, ?, ?, 'paid')
         ON CONFLICT (student_id, group_id, year, month)
         DO UPDATE SET amount = excluded.amount, paid_at = excluded.paid_at, status = 'paid'`,
      ).run(input.student_id, input.group_id, input.month, input.year, requireAmount(input.amount, "Montant"), input.paid_at);
    },

    cancelPayment(paymentId: number) {
      db.prepare("DELETE FROM payments WHERE id = ?").run(paymentId);
    },

    listStudentPayments(studentId: number): StudentPaymentRecord[] {
      return db
        .prepare(
          `SELECT p.id, p.group_id, g.name AS group_name, p.year, p.month, p.amount, p.paid_at
           FROM payments p JOIN groups g ON g.id = p.group_id
           WHERE p.student_id = ? AND p.status = 'paid'
           ORDER BY p.year DESC, p.month DESC, g.name COLLATE NOCASE`,
        )
        .all(studentId) as StudentPaymentRecord[];
    },
  };
}
