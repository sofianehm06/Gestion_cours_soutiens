import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import { useFormat } from "../format";
import { useLoader } from "../hooks";
import { Modal } from "./Modal";
import { Icon } from "./Icon";

export function StudentDetail({ studentId, onClose }: { studentId: number; onClose: () => void }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const [tab, setTab] = useState<"payments" | "attendance">("payments");
  const { data } = useLoader(async () => {
    const [students, payments, attendance] = await Promise.all([
      api.listStudents({ status: "all" }),
      api.listStudentPayments(studentId),
      api.listStudentAttendance(studentId),
    ]);
    return { student: students.find((s) => s.id === studentId) ?? null, payments, attendance };
  }, [studentId]);

  const student = data?.student;
  const presentCount = data?.attendance.filter((a) => a.present).length ?? 0;
  const total = data?.attendance.length ?? 0;

  return (
    <Modal title={student ? `${student.last_name} ${student.first_name}` : t("common.loading")} onClose={onClose} wide>
      {student && data && (
        <>
          <div className="detail-head">
            <span className={`badge ${student.is_active ? "badge-paid" : "badge-muted"}`}>
              {student.is_active ? t("students.active") : t("students.inactive")}
            </span>
            {student.parent_phone && (
              <span className="muted inline-icon">
                <Icon name="phone" size={14} /> <span dir="ltr">{student.parent_phone}</span>
              </span>
            )}
            <span className="muted">
              {t("students.enrolledAt")} : {fmt.date(student.enrolled_at)}
            </span>
          </div>
          <div className="chips">
            {student.groups.length === 0 && <span className="muted">{t("students.noGroup")}</span>}
            {student.groups.map((g) => (
              <span key={g.group_id} className="chip">
                {g.group_name} · {fmt.money(g.price)}
              </span>
            ))}
          </div>

          <div className="tabs">
            <button type="button" className={tab === "payments" ? "active" : ""} onClick={() => setTab("payments")}>
              {t("students.paymentsTab")} ({data.payments.length})
            </button>
            <button type="button" className={tab === "attendance" ? "active" : ""} onClick={() => setTab("attendance")}>
              {t("students.attendanceTab")} ({total})
            </button>
          </div>

          {tab === "payments" &&
            (data.payments.length === 0 ? (
              <p className="empty">{t("students.noPayments")}</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("students.period")}</th>
                    <th>{t("common.group")}</th>
                    <th>{t("common.amount")}</th>
                    <th>{t("payments.paidAt")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="strong">{fmt.monthLabel(p.year, p.month)}</td>
                      <td>{p.group_name}</td>
                      <td>{fmt.money(p.amount)}</td>
                      <td>{fmt.date(p.paid_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}

          {tab === "attendance" &&
            (total === 0 ? (
              <p className="empty">{t("students.noAttendance")}</p>
            ) : (
              <>
                <p className="muted">
                  {t("students.attendanceRate", { rate: Math.round((presentCount / total) * 100), present: presentCount, total })}
                </p>
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("common.date")}</th>
                      <th>{t("common.group")}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.attendance.map((a) => (
                      <tr key={`${a.date}-${a.group_id}`}>
                        <td>{fmt.weekday(a.date)}</td>
                        <td>{a.group_name}</td>
                        <td>
                          <span className={`badge ${a.present ? "badge-paid" : "badge-late"}`}>
                            {a.present ? t("attendance.present") : t("attendance.absent")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ))}
        </>
      )}
    </Modal>
  );
}
