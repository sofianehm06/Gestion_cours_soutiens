import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import { useApp } from "../app-context";
import { Icon } from "../components/Icon";
import { ConfirmDialog, Modal } from "../components/Modal";
import { StatusBadge } from "../components/StatusBadge";
import { parseAmount, useFormat } from "../format";
import { useAction, useLoader } from "../hooks";
import { isoDate } from "../../shared/payments";
import type { Group, MonthlyPaymentRow } from "../../shared/types";

interface Period {
  year: number;
  month: number;
}

function shiftMonth({ year, month }: Period, delta: number): Period {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function CollectDialog({
  row,
  group,
  period,
  onClose,
  onSaved,
}: {
  row: MonthlyPaymentRow;
  group: Group;
  period: Period;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const run = useAction();
  const [amount, setAmount] = useState(String(row.amount_due));
  const [paidAt, setPaidAt] = useState(isoDate(new Date()));
  const value = parseAmount(amount);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (value === null) return;
    const ok = await run(
      () =>
        api.recordPayment({ student_id: row.student_id, group_id: group.id, year: period.year, month: period.month, amount: value, paid_at: paidAt }),
      t("common.saved"),
    );
    if (ok) onSaved();
  };

  return (
    <Modal title={t("payments.collectTitle")} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <p className="strong">
          {t("payments.collectFor", {
            name: `${row.last_name} ${row.first_name}`,
            group: group.name,
            month: fmt.monthLabel(period.year, period.month),
          })}
        </p>
        <label>
          {t("common.amount")} (DA)
          <input autoFocus inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} onFocus={(e) => e.target.select()} />
        </label>
        <label>
          {t("payments.paidAt")}
          <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
        </label>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" className="btn btn-primary" disabled={value === null || !paidAt}>
            <Icon name="check" /> {t("payments.collect")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function PaymentsPage() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { params, openStudent } = useApp();
  const run = useAction();
  const now = new Date();
  const [period, setPeriod] = useState<Period>({ year: params.year ?? now.getFullYear(), month: params.month ?? now.getMonth() + 1 });
  const [groupId, setGroupId] = useState<number | null>(params.groupId ?? null);
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [collecting, setCollecting] = useState<MonthlyPaymentRow | null>(null);
  const [cancelling, setCancelling] = useState<MonthlyPaymentRow | null>(null);

  const { data: groups } = useLoader(() => api.listGroups(), []);
  const activeGroupId = groupId ?? groups?.[0]?.id ?? null;
  const group = groups?.find((g) => g.id === activeGroupId) ?? null;
  const { data: rows, reload } = useLoader(
    () => (activeGroupId ? api.getMonthlyPayments(activeGroupId, period.year, period.month) : Promise.resolve([])),
    [activeGroupId, period.year, period.month],
  );

  const expected = rows?.reduce((sum, r) => sum + r.amount_due, 0) ?? 0;
  const collected = rows?.reduce((sum, r) => sum + (r.amount_paid ?? 0), 0) ?? 0;
  const visible = rows?.filter((r) => filter === "all" || (filter === "paid" ? r.status === "paid" : r.status !== "paid")) ?? [];
  const unpaidCount = rows?.filter((r) => r.status !== "paid").length ?? 0;

  if (groups && groups.length === 0) {
    return (
      <>
        <header className="page-header">
          <h1>{t("payments.title")}</h1>
        </header>
        <section className="card">
          <p className="empty">{t("payments.noGroups")}</p>
        </section>
      </>
    );
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{t("payments.title")}</h1>
          <p className="muted">{t("payments.subtitle")}</p>
        </div>
        <div className="month-nav">
          <button type="button" className="icon-btn flip-rtl" title={t("common.previous")} onClick={() => setPeriod(shiftMonth(period, -1))}>
            <Icon name="chevronLeft" />
          </button>
          <strong>{fmt.monthLabel(period.year, period.month)}</strong>
          <button type="button" className="icon-btn flip-rtl" title={t("common.next")} onClick={() => setPeriod(shiftMonth(period, 1))}>
            <Icon name="chevronRight" />
          </button>
        </div>
      </header>

      <div className="pills">
        {groups?.map((g) => (
          <button key={g.id} type="button" className={`pill ${activeGroupId === g.id ? "active" : ""}`} onClick={() => setGroupId(g.id)}>
            {g.name}
            <span className="pill-count">{fmt.money(g.monthly_price)}</span>
          </button>
        ))}
      </div>

      <section className="stats stats-compact">
        <div className="stat-card">
          <div>
            <div className="stat-label">{t("payments.expected")}</div>
            <div className="stat-value">{fmt.money(expected)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <div className="stat-label">{t("payments.collected")}</div>
            <div className="stat-value text-green">{fmt.money(collected)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <div className="stat-label">{t("payments.remaining")}</div>
            <div className="stat-value text-amber">{fmt.money(Math.max(expected - collected, 0))}</div>
          </div>
        </div>
      </section>

      <div className="toolbar">
        <div className="segmented">
          <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
            {t("payments.filterAll")} ({rows?.length ?? 0})
          </button>
          <button type="button" className={filter === "unpaid" ? "active" : ""} onClick={() => setFilter("unpaid")}>
            {t("payments.filterUnpaid")} ({unpaidCount})
          </button>
          <button type="button" className={filter === "paid" ? "active" : ""} onClick={() => setFilter("paid")}>
            {t("payments.filterPaid")} ({(rows?.length ?? 0) - unpaidCount})
          </button>
        </div>
      </div>

      <section className="card no-pad">
        {rows && visible.length === 0 ? (
          <p className="empty">{t("payments.empty")}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t("students.fullName")}</th>
                <th>{t("common.phone")}</th>
                <th>{t("payments.due")}</th>
                <th>{t("payments.status")}</th>
                <th>{t("payments.paidAt")}</th>
                <th className="cell-actions">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.student_id}>
                  <td>
                    <button type="button" className="link strong" onClick={() => openStudent(r.student_id)}>
                      {r.last_name} {r.first_name}
                    </button>
                  </td>
                  <td>
                    <span dir="ltr">{r.parent_phone || "—"}</span>
                  </td>
                  <td>
                    {fmt.money(r.amount_due)}
                    {r.amount_paid !== null && r.amount_paid !== r.amount_due && (
                      <div className="muted small">
                        {t("payments.collected")} : {fmt.money(r.amount_paid)}
                      </div>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>{fmt.date(r.paid_at)}</td>
                  <td className="cell-actions">
                    {r.status === "paid" ? (
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setCancelling(r)}>
                        {t("payments.cancelPayment")}
                      </button>
                    ) : (
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => setCollecting(r)}>
                        <Icon name="wallet" size={14} /> {t("payments.collect")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {collecting && group && (
        <CollectDialog
          row={collecting}
          group={group}
          period={period}
          onClose={() => setCollecting(null)}
          onSaved={() => {
            setCollecting(null);
            void reload();
          }}
        />
      )}
      {cancelling && (
        <ConfirmDialog
          danger
          title={t("payments.cancelTitle")}
          message={t("payments.cancelText", {
            name: `${cancelling.last_name} ${cancelling.first_name}`,
            month: fmt.monthLabel(period.year, period.month),
          })}
          onClose={() => setCancelling(null)}
          onConfirm={async () => {
            if (cancelling.payment_id) await run(() => api.cancelPayment(cancelling.payment_id!));
            void reload();
          }}
        />
      )}
    </>
  );
}
