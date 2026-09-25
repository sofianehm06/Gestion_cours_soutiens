import { useTranslation } from "react-i18next";
import { api } from "../api";
import { useApp } from "../app-context";
import { Icon, type IconName } from "../components/Icon";
import { useFormat } from "../format";
import { useLoader } from "../hooks";
import { PAYMENT_DUE_DAY } from "../../shared/types";

function StatCard({ icon, label, value, hint, tone }: { icon: IconName; label: string; value: string; hint?: string; tone: string }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon tone-${tone}`}>
        <Icon name={icon} size={22} />
      </div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { navigate, openStudent } = useApp();
  const { data } = useLoader(() => api.getDashboard(), []);

  if (!data) return <p className="muted">{t("common.loading")}</p>;

  const remaining = Math.max(data.expected_revenue - data.collected_revenue, 0);
  const rate = data.expected_revenue > 0 ? Math.min(100, Math.round((data.collected_revenue / data.expected_revenue) * 100)) : 0;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{t("dashboard.title")}</h1>
          <p className="muted">{t("dashboard.subtitle", { month: fmt.monthLabel(data.year, data.month) })}</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn" onClick={() => navigate("students", { create: true })}>
            <Icon name="plus" /> {t("dashboard.quickStudent")}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => navigate("attendance")}>
            <Icon name="attendance" /> {t("dashboard.quickAttendance")}
          </button>
        </div>
      </header>

      {data.group_count === 0 && (
        <section className="card welcome">
          <h2>{t("dashboard.welcomeTitle")}</h2>
          <p>{t("dashboard.welcomeText")}</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate("groups", { create: true })}>
            <Icon name="plus" /> {t("dashboard.createGroup")}
          </button>
        </section>
      )}

      <section className="stats">
        <StatCard
          icon="user"
          tone="blue"
          label={t("dashboard.activeStudents")}
          value={String(data.active_students)}
          hint={t("dashboard.groupsCount", { count: data.group_count })}
        />
        <StatCard icon="trend" tone="slate" label={t("dashboard.expected")} value={fmt.money(data.expected_revenue)} />
        <StatCard
          icon="wallet"
          tone="green"
          label={t("dashboard.collected")}
          value={fmt.money(data.collected_revenue)}
          hint={t("dashboard.collectedRate", { rate })}
        />
        <StatCard icon="warning" tone="amber" label={t("dashboard.remaining")} value={fmt.money(remaining)} />
      </section>

      <div className="progress" aria-hidden="true">
        <div className="progress-bar" style={{ width: `${rate}%` }} />
      </div>

      <section className="card">
        <div className="card-header">
          <h2>
            {t("dashboard.lateTitle")} {data.late_students.length > 0 && <span className="count-pill">{data.late_students.length}</span>}
          </h2>
          <span className="muted small">{t("dashboard.dueDayHint", { day: PAYMENT_DUE_DAY })}</span>
        </div>
        {data.late_students.length === 0 ? (
          <p className="empty success-text">
            <Icon name="check" /> {t("dashboard.lateEmpty")}
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t("students.fullName")}</th>
                <th>{t("common.group")}</th>
                <th>{t("dashboard.monthsLate")}</th>
                <th>{t("dashboard.owed")}</th>
                <th>{t("common.phone")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.late_students.map((s) => {
                const oldest = s.months[0];
                return (
                  <tr key={`${s.student_id}-${s.group_id}`}>
                    <td>
                      <button type="button" className="link strong" onClick={() => openStudent(s.student_id)}>
                        {s.last_name} {s.first_name}
                      </button>
                    </td>
                    <td>{s.group_name}</td>
                    <td>
                      <div className="chips">
                        {s.months.map((m) => (
                          <span key={`${m.year}-${m.month}`} className="chip chip-late">
                            {fmt.monthName(m.month)} {m.year !== data.year ? m.year : ""}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="strong">{fmt.money(s.amount_owed)}</td>
                    <td>
                      <span dir="ltr">{s.parent_phone || "—"}</span>
                    </td>
                    <td className="cell-actions">
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => navigate("payments", { groupId: s.group_id, year: oldest.year, month: oldest.month })}
                      >
                        {t("dashboard.collect")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
