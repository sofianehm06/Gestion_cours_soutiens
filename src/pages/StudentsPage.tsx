import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import { useApp } from "../app-context";
import { Icon } from "../components/Icon";
import { ConfirmDialog, Modal } from "../components/Modal";
import { parseAmount, useFormat } from "../format";
import { useAction, useLoader } from "../hooks";
import { isoDate } from "../../shared/payments";
import type { Group, Student, StudentFilter } from "../../shared/types";

const STATUS_LABELS = {
  active: "students.statusActive",
  inactive: "students.statusInactive",
  all: "students.statusAll",
} as const;

interface FormProps {
  student: Student | null;
  groups: Group[];
  defaultGroupId?: number;
  onClose: () => void;
  onSaved: () => void;
}

function StudentForm({ student, groups, defaultGroupId, onClose, onSaved }: FormProps) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const run = useAction();
  const [firstName, setFirstName] = useState(student?.first_name ?? "");
  const [lastName, setLastName] = useState(student?.last_name ?? "");
  const [phone, setPhone] = useState(student?.parent_phone ?? "");
  const [enrolledAt, setEnrolledAt] = useState(student?.enrolled_at ?? isoDate(new Date()));
  const [active, setActive] = useState(student?.is_active ?? true);
  // group_id -> tarif personnalisé saisi ("" = tarif du groupe)
  const [selected, setSelected] = useState<Map<number, string>>(() => {
    const map = new Map<number, string>();
    student?.groups.forEach((g) => map.set(g.group_id, g.custom_price == null ? "" : String(g.custom_price)));
    if (!student && defaultGroupId) map.set(defaultGroupId, "");
    return map;
  });

  const toggleGroup = (id: number) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, "");
      return next;
    });

  const setCustomPrice = (id: number, value: string) => setSelected((prev) => new Map(prev).set(id, value));

  const pricesValid = [...selected.values()].every((v) => v.trim() === "" || parseAmount(v) !== null);
  const valid = firstName.trim() !== "" && lastName.trim() !== "" && pricesValid;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const input = {
      first_name: firstName,
      last_name: lastName,
      parent_phone: phone,
      enrolled_at: enrolledAt,
      is_active: active,
      groups: [...selected.entries()].map(([group_id, price]) => ({
        group_id,
        custom_price: price.trim() === "" ? null : parseAmount(price),
      })),
    };
    const ok = await run(() => (student ? api.updateStudent(student.id, input) : api.createStudent(input)), t("common.saved"));
    if (ok) onSaved();
  };

  return (
    <Modal title={student ? t("students.editTitle") : t("students.newTitle")} onClose={onClose} wide>
      <form className="form" onSubmit={submit}>
        <div className="form-row">
          <label>
            {t("students.lastName")}
            <input autoFocus value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </label>
          <label>
            {t("students.firstName")}
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </label>
        </div>
        <div className="form-row">
          <label>
            {t("students.parentPhone")}
            <input type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05 55 12 34 56" />
          </label>
          <label>
            {t("students.enrolledAt")}
            <input type="date" value={enrolledAt} onChange={(e) => setEnrolledAt(e.target.value)} required />
          </label>
        </div>

        <fieldset className="group-picker">
          <legend>{t("students.groups")}</legend>
          {groups.length === 0 && <p className="muted">{t("students.noGroupsYet")}</p>}
          {groups.map((g) => {
            const checked = selected.has(g.id);
            return (
              <div key={g.id} className={`group-option ${checked ? "checked" : ""}`}>
                <label className="checkbox">
                  <input type="checkbox" checked={checked} onChange={() => toggleGroup(g.id)} />
                  <span>
                    <strong>{g.name}</strong> {g.level && <span className="muted">· {g.level}</span>}
                    <span className="muted"> · {fmt.money(g.monthly_price)}</span>
                  </span>
                </label>
                {checked && (
                  <input
                    className="price-input"
                    inputMode="numeric"
                    value={selected.get(g.id)}
                    onChange={(e) => setCustomPrice(g.id, e.target.value)}
                    placeholder={t("students.customPrice")}
                    title={t("students.customPriceHint", { price: fmt.money(g.monthly_price) })}
                  />
                )}
              </div>
            );
          })}
        </fieldset>

        <label className="checkbox">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          <span>{t("students.active")}</span>
        </label>

        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" className="btn btn-primary" disabled={!valid}>
            {t("common.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function StudentsPage() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { params, openStudent } = useApp();
  const run = useAction();
  const [filter, setFilter] = useState<StudentFilter>({ groupId: params.groupId ?? null, status: "active", search: "" });
  const { data: groups } = useLoader(() => api.listGroups(), []);
  const { data: students, reload } = useLoader(() => api.listStudents(filter), [filter.groupId, filter.status, filter.search]);
  const [editing, setEditing] = useState<Student | "new" | null>(params.create ? "new" : null);
  const [deleting, setDeleting] = useState<Student | null>(null);

  const toggleActive = async (s: Student) => {
    await run(() => api.setStudentActive(s.id, !s.is_active));
    void reload();
  };

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{t("students.title")}</h1>
          <p className="muted">{t("students.subtitle", { count: students?.length ?? 0 })}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
          <Icon name="plus" /> {t("students.new")}
        </button>
      </header>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={16} />
          <input
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            placeholder={t("common.search")}
          />
        </div>
        <select
          value={filter.groupId ?? ""}
          onChange={(e) => setFilter({ ...filter, groupId: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">{t("common.allGroups")}</option>
          {groups?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <div className="segmented">
          {(["active", "inactive", "all"] as const).map((status) => (
            <button
              key={status}
              type="button"
              className={filter.status === status ? "active" : ""}
              onClick={() => setFilter({ ...filter, status })}
            >
              {t(STATUS_LABELS[status])}
            </button>
          ))}
        </div>
      </div>

      <section className="card no-pad">
        {students && students.length === 0 ? (
          <p className="empty">{t("students.empty")}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t("students.fullName")}</th>
                <th>{t("students.parentPhone")}</th>
                <th>{t("students.groups")}</th>
                <th>{t("students.enrolledAt")}</th>
                <th />
                <th className="cell-actions">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {students?.map((s) => (
                <tr key={s.id} className={s.is_active ? "" : "row-inactive"}>
                  <td>
                    <button type="button" className="link strong" onClick={() => openStudent(s.id)}>
                      {s.last_name} {s.first_name}
                    </button>
                  </td>
                  <td>
                    <span dir="ltr">{s.parent_phone || "—"}</span>
                  </td>
                  <td>
                    <div className="chips">
                      {s.groups.length === 0 && <span className="muted">{t("students.noGroup")}</span>}
                      {s.groups.map((g) => (
                        <span key={g.group_id} className={`chip ${g.custom_price != null ? "chip-custom" : ""}`}>
                          {g.group_name} · {fmt.money(g.price)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{fmt.date(s.enrolled_at)}</td>
                  <td>
                    <span className={`badge ${s.is_active ? "badge-paid" : "badge-muted"}`}>
                      {s.is_active ? t("students.active") : t("students.inactive")}
                    </span>
                  </td>
                  <td className="cell-actions">
                    <button type="button" className="icon-btn" title={t("common.edit")} onClick={() => setEditing(s)}>
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title={s.is_active ? t("students.deactivate") : t("students.activate")}
                      onClick={() => toggleActive(s)}
                    >
                      <Icon name={s.is_active ? "pause" : "play"} size={16} />
                    </button>
                    <button type="button" className="icon-btn danger" title={t("common.delete")} onClick={() => setDeleting(s)}>
                      <Icon name="trash" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {editing && groups && (
        <StudentForm
          student={editing === "new" ? null : editing}
          groups={groups}
          defaultGroupId={filter.groupId ?? undefined}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void reload();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          danger
          title={t("students.deleteTitle")}
          message={t("students.deleteText", { name: `${deleting.last_name} ${deleting.first_name}` })}
          confirmLabel={t("common.delete")}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await run(() => api.deleteStudent(deleting.id));
            void reload();
          }}
        />
      )}
    </>
  );
}
