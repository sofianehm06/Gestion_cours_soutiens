import { describe, expect, it } from "vitest";
import { openDatabase } from "../electron/database";
import { createRepository } from "../electron/repository";

function setup(today = new Date(2026, 8, 25)) {
  const db = openDatabase(":memory:");
  const repo = createRepository(db, () => today);
  const maths = repo.createGroup({ name: "Maths 3AS", level: "3AS", monthly_price: 4000 });
  const fr = repo.createGroup({ name: "Français 1AM", level: "1AM", monthly_price: 2000 });
  const ali = repo.createStudent({
    first_name: "Ali",
    last_name: "Benali",
    parent_phone: "0550 00 00 00",
    enrolled_at: "2026-09-01",
    is_active: true,
    groups: [
      { group_id: maths, custom_price: null },
      { group_id: fr, custom_price: 1500 },
    ],
  });
  const sara = repo.createStudent({
    first_name: "Sara",
    last_name: "Amrani",
    parent_phone: "",
    enrolled_at: "2026-08-01",
    is_active: true,
    groups: [{ group_id: maths, custom_price: null }],
  });
  return { db, repo, maths, fr, ali, sara };
}

describe("groupes et élèves", () => {
  it("compte les élèves actifs par groupe et applique les tarifs personnalisés", () => {
    const { repo, maths, fr, ali } = setup();
    const groups = repo.listGroups();
    expect(groups.find((g) => g.id === maths)?.student_count).toBe(2);
    expect(groups.find((g) => g.id === fr)?.student_count).toBe(1);

    const student = repo.listStudents({}).find((s) => s.id === ali)!;
    expect(student.groups.map((g) => g.price).sort()).toEqual([1500, 4000]);
  });

  it("filtre par groupe, statut et recherche", () => {
    const { repo, fr, sara } = setup();
    expect(repo.listStudents({ groupId: fr }).map((s) => s.first_name)).toEqual(["Ali"]);
    repo.setStudentActive(sara, false);
    expect(repo.listStudents({ status: "inactive" }).map((s) => s.first_name)).toEqual(["Sara"]);
    expect(repo.listStudents({ search: "benali ali" })).toHaveLength(1);
    expect(repo.listStudents({ search: "karim" })).toHaveLength(0);
  });

  it("met à jour les groupes d'un élève", () => {
    const { repo, maths, ali } = setup();
    repo.updateStudent(ali, {
      first_name: "Ali",
      last_name: "Benali",
      parent_phone: "",
      enrolled_at: "2026-09-01",
      is_active: true,
      groups: [{ group_id: maths, custom_price: 3500 }],
    });
    const student = repo.listStudents({}).find((s) => s.id === ali)!;
    expect(student.groups).toHaveLength(1);
    expect(student.groups[0].price).toBe(3500);
  });

  it("refuse un groupe sans nom", () => {
    const { repo } = setup();
    expect(() => repo.createGroup({ name: "  ", level: "", monthly_price: 1000 })).toThrow();
  });
});

describe("présences", () => {
  it("enregistre et relit une séance", () => {
    const { repo, maths, ali, sara } = setup();
    expect(repo.getAttendance(maths, "2026-09-20").every((e) => e.present === null)).toBe(true);
    repo.saveAttendance(maths, "2026-09-20", [
      { student_id: ali, present: true },
      { student_id: sara, present: false },
    ]);
    repo.saveAttendance(maths, "2026-09-20", [{ student_id: ali, present: false }]);
    const entries = repo.getAttendance(maths, "2026-09-20");
    expect(entries.map((e) => e.present)).toEqual([false, false]);

    const sessions = repo.listGroupSessions(maths);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].absent).toBe(2);
    expect(repo.listStudentAttendance(ali)).toHaveLength(1);
  });
});

describe("paiements", () => {
  it("calcule payé / en retard pour le mois", () => {
    const { repo, maths, ali, sara } = setup();
    repo.recordPayment({ student_id: ali, group_id: maths, year: 2026, month: 9, amount: 4000, paid_at: "2026-09-05" });
    const rows = repo.getMonthlyPayments(maths, 2026, 9);
    expect(rows.find((r) => r.student_id === ali)?.status).toBe("paid");
    expect(rows.find((r) => r.student_id === sara)?.status).toBe("late");
  });

  it("n'affiche pas un élève inscrit après le mois consulté", () => {
    const { repo, maths } = setup();
    expect(repo.getMonthlyPayments(maths, 2026, 8).map((r) => r.first_name)).toEqual(["Sara"]);
  });

  it("met en attente le mois courant avant l'échéance", () => {
    const { repo, maths } = setup(new Date(2026, 8, 5));
    expect(repo.getMonthlyPayments(maths, 2026, 9).every((r) => r.status === "pending")).toBe(true);
  });

  it("annule un paiement", () => {
    const { repo, maths, ali } = setup();
    repo.recordPayment({ student_id: ali, group_id: maths, year: 2026, month: 9, amount: 4000, paid_at: "2026-09-05" });
    const [payment] = repo.listStudentPayments(ali);
    repo.cancelPayment(payment.id);
    expect(repo.listStudentPayments(ali)).toHaveLength(0);
  });
});

describe("tableau de bord", () => {
  it("calcule revenus attendus, encaissés et retards", () => {
    const { repo, maths, fr, ali, sara } = setup();
    repo.recordPayment({ student_id: ali, group_id: maths, year: 2026, month: 9, amount: 4000, paid_at: "2026-09-05" });
    const d = repo.getDashboard();
    expect(d.active_students).toBe(2);
    expect(d.expected_revenue).toBe(4000 + 1500 + 4000);
    expect(d.collected_revenue).toBe(4000);

    const saraLate = d.late_students.find((l) => l.student_id === sara)!;
    expect(saraLate.months).toEqual([
      { year: 2026, month: 8 },
      { year: 2026, month: 9 },
    ]);
    expect(saraLate.amount_owed).toBe(8000);
    expect(d.late_students.find((l) => l.student_id === ali && l.group_id === fr)?.amount_owed).toBe(1500);
    expect(d.late_students.some((l) => l.student_id === ali && l.group_id === maths)).toBe(false);
  });

  it("supprime en cascade les données d'un groupe", () => {
    const { db, repo, maths, ali } = setup();
    repo.recordPayment({ student_id: ali, group_id: maths, year: 2026, month: 9, amount: 4000, paid_at: "2026-09-05" });
    repo.deleteGroup(maths);
    expect((db.prepare("SELECT COUNT(*) AS n FROM payments").get() as { n: number }).n).toBe(0);
    expect(repo.listStudents({}).find((s) => s.id === ali)!.groups).toHaveLength(1);
  });
});
