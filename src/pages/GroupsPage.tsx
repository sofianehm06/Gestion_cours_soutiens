import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import { useApp } from "../app-context";
import { Icon } from "../components/Icon";
import { ConfirmDialog, Modal } from "../components/Modal";
import { parseAmount, useFormat } from "../format";
import { useAction, useLoader } from "../hooks";
import type { Group } from "../../shared/types";

/** Niveaux du système scolaire algérien, proposés à la saisie. */
const LEVELS = [
  "1AP", "2AP", "3AP", "4AP", "5AP",
  "1AM", "2AM", "3AM", "4AM (BEM)",
  "1AS", "2AS", "3AS (BAC)",
];

function GroupForm({ group, onClose, onSaved }: { group: Group | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const run = useAction();
  const [name, setName] = useState(group?.name ?? "");
  const [level, setLevel] = useState(group?.level ?? "");
  const [price, setPrice] = useState(group ? String(group.monthly_price) : "");
  const amount = parseAmount(price);
  const valid = name.trim() !== "" && amount !== null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const input = { name, level, monthly_price: amount };
    const ok = await run(() => (group ? api.updateGroup(group.id, input) : api.createGroup(input)), t("common.saved"));
    if (ok) onSaved();
  };

  return (
    <Modal title={group ? t("groups.editTitle") : t("groups.newTitle")} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          {t("groups.name")}
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t("groups.namePlaceholder")} required />
        </label>
        <label>
          {t("groups.level")}
          <input list="levels" value={level} onChange={(e) => setLevel(e.target.value)} placeholder={t("groups.levelPlaceholder")} />
          <datalist id="levels">
            {LEVELS.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </label>
        <label>
          {t("groups.price")}
          <input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="2000" required />
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

export function GroupsPage() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { params, navigate } = useApp();
  const run = useAction();
  const { data: groups, reload } = useLoader(() => api.listGroups(), []);
  const [editing, setEditing] = useState<Group | "new" | null>(params.create ? "new" : null);
  const [deleting, setDeleting] = useState<Group | null>(null);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{t("groups.title")}</h1>
          <p className="muted">{t("groups.subtitle")}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
          <Icon name="plus" /> {t("groups.new")}
        </button>
      </header>

      {groups && groups.length === 0 && (
        <section className="card">
          <p className="empty">{t("groups.empty")}</p>
        </section>
      )}

      <section className="group-grid">
        {groups?.map((g) => (
          <article key={g.id} className="card group-card">
            <div className="group-card-top">
              <div>
                <h3>{g.name}</h3>
                {g.level && <span className="chip">{g.level}</span>}
              </div>
              <div className="group-actions">
                <button type="button" className="icon-btn" title={t("common.edit")} onClick={() => setEditing(g)}>
                  <Icon name="edit" size={16} />
                </button>
                <button type="button" className="icon-btn danger" title={t("common.delete")} onClick={() => setDeleting(g)}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </div>
            <div className="group-price">
              {fmt.money(g.monthly_price)} <span className="muted small">{t("common.perMonth")}</span>
            </div>
            <div className="group-card-bottom">
              <span className="muted">{t("groups.students", { count: g.student_count })}</span>
              <button type="button" className="link" onClick={() => navigate("students", { groupId: g.id })}>
                {t("groups.seeStudents")}
              </button>
            </div>
          </article>
        ))}
      </section>

      {editing && (
        <GroupForm
          group={editing === "new" ? null : editing}
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
          title={t("groups.deleteTitle")}
          message={t("groups.deleteText", { name: deleting.name })}
          confirmLabel={t("common.delete")}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await run(() => api.deleteGroup(deleting.id));
            void reload();
          }}
        />
      )}
    </>
  );
}
