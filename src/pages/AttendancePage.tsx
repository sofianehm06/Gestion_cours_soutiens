import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import { useApp } from "../app-context";
import { Icon } from "../components/Icon";
import { parseIso, useFormat } from "../format";
import { useAction, useLoader } from "../hooks";
import { isoDate } from "../../shared/payments";
import type { AttendanceEntry, Group } from "../../shared/types";

const LAST_GROUP_KEY = "soutienpro.attendance.group";

function rememberedGroup(groups: Group[]): number | null {
  try {
    const id = Number(localStorage.getItem(LAST_GROUP_KEY));
    if (groups.some((g) => g.id === id)) return id;
  } catch {
    // Préférence indisponible.
  }
  return groups[0]?.id ?? null;
}

function shiftDate(iso: string, days: number) {
  const d = parseIso(iso);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

function GroupPills({ groups, value, onChange }: { groups: Group[]; value: number | null; onChange: (id: number) => void }) {
  return (
    <div className="pills">
      {groups.map((g) => (
        <button key={g.id} type="button" className={`pill ${value === g.id ? "active" : ""}`} onClick={() => onChange(g.id)}>
          {g.name}
          <span className="pill-count">{g.student_count}</span>
        </button>
      ))}
    </div>
  );
}

function SessionView({ groups, initialGroup, initialDate }: { groups: Group[]; initialGroup: number | null; initialDate: string }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const run = useAction();
  const [groupId, setGroupId] = useState<number | null>(initialGroup);
  const [date, setDate] = useState(initialDate);
  const [marks, setMarks] = useState<Map<number, boolean>>(new Map());
  const [dirty, setDirty] = useState(false);

  const { data: entries, reload } = useLoader<AttendanceEntry[]>(
    () => (groupId ? api.getAttendance(groupId, date) : Promise.resolve([])),
    [groupId, date],
  );
  const alreadySaved = entries?.some((e) => e.present !== null) ?? false;

  // Séance non enregistrée : tout le monde présent par défaut.
  useEffect(() => {
    if (!entries) return;
    setMarks(new Map(entries.map((e) => [e.student_id, e.present ?? true])));
    setDirty(false);
  }, [entries]);

  const selectGroup = (id: number) => {
    setGroupId(id);
    try {
      localStorage.setItem(LAST_GROUP_KEY, String(id));
    } catch {
      // Préférence non persistée.
    }
  };

  const toggle = (id: number) => {
    setMarks((prev) => new Map(prev).set(id, !prev.get(id)));
    setDirty(true);
  };

  const setAll = (present: boolean) => {
    setMarks((prev) => new Map([...prev.keys()].map((id) => [id, present])));
    setDirty(true);
  };

  const save = async () => {
    if (!groupId) return;
    const payload = [...marks.entries()].map(([student_id, present]) => ({ student_id, present }));
    if (await run(() => api.saveAttendance(groupId, date, payload), t("attendance.saved"))) void reload();
  };

  const presentCount = [...marks.values()].filter(Boolean).length;
  const absentCount = marks.size - presentCount;
  const today = isoDate(new Date());

  return (
    <>
      <GroupPills groups={groups} value={groupId} onChange={selectGroup} />

      <div className="toolbar">
        <div className="date-nav">
          <button type="button" className="icon-btn flip-rtl" title={t("common.previous")} onClick={() => setDate(shiftDate(date, -1))}>
            <Icon name="chevronLeft" />
          </button>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <button type="button" className="icon-btn flip-rtl" title={t("common.next")} onClick={() => setDate(shiftDate(date, 1))}>
            <Icon name="chevronRight" />
          </button>
          {date !== today && (
            <button type="button" className="btn btn-sm" onClick={() => setDate(today)}>
              {t("common.today")}
            </button>
          )}
        </div>
        <strong className="date-label">{fmt.weekday(date)}</strong>
      </div>

      {entries && entries.length === 0 ? (
        <section className="card">
          <p className="empty">{t("attendance.noStudents")}</p>
        </section>
      ) : (
        <section className="card">
          <div className="card-header">
            <div className="counters">
              <span className="badge badge-paid">{t("attendance.presentCount", { count: presentCount })}</span>
              <span className="badge badge-late">{t("attendance.absentCount", { count: absentCount })}</span>
            </div>
            <div className="header-actions">
              <button type="button" className="btn btn-sm" onClick={() => setAll(true)}>
                {t("attendance.allPresent")}
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setAll(false)}>
                {t("attendance.allAbsent")}
              </button>
            </div>
          </div>
          <p className={`hint ${dirty ? "hint-warn" : ""}`}>
            {dirty ? t("attendance.unsaved") : alreadySaved ? t("attendance.savedHint") : t("attendance.notSavedHint")}
          </p>

          <ul className="roll">
            {entries?.map((e) => {
              const present = marks.get(e.student_id) ?? true;
              return (
                <li key={e.student_id}>
                  <button type="button" className={`roll-row ${present ? "is-present" : "is-absent"}`} onClick={() => toggle(e.student_id)}>
                    <span className="roll-check">
                      <Icon name={present ? "check" : "close"} size={18} />
                    </span>
                    <span className="roll-name">
                      {e.last_name} {e.first_name}
                    </span>
                    <span className="roll-status">{present ? t("attendance.present") : t("attendance.absent")}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="sticky-actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={save} disabled={!groupId || marks.size === 0}>
              <Icon name="check" /> {t("attendance.saveSession")}
            </button>
          </div>
        </section>
      )}
    </>
  );
}

function HistoryView({ groups, onOpenSession }: { groups: Group[]; onOpenSession: (groupId: number, date: string) => void }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { openStudent } = useApp();
  const [mode, setMode] = useState<"group" | "student">("group");
  const [groupId, setGroupId] = useState<number | null>(rememberedGroup(groups));
  const [studentId, setStudentId] = useState<number | null>(null);

  const { data: students } = useLoader(() => api.listStudents({ status: "all" }), []);
  const { data: sessions } = useLoader(() => (groupId ? api.listGroupSessions(groupId) : Promise.resolve([])), [groupId]);
  const { data: records } = useLoader(() => (studentId ? api.listStudentAttendance(studentId) : Promise.resolve([])), [studentId]);

  const presentCount = records?.filter((r) => r.present).length ?? 0;

  return (
    <>
      <div className="toolbar">
        <div className="segmented">
          <button type="button" className={mode === "group" ? "active" : ""} onClick={() => setMode("group")}>
            {t("attendance.byGroup")}
          </button>
          <button type="button" className={mode === "student" ? "active" : ""} onClick={() => setMode("student")}>
            {t("attendance.byStudent")}
          </button>
        </div>
        {mode === "group" ? (
          <select value={groupId ?? ""} onChange={(e) => setGroupId(Number(e.target.value) || null)}>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        ) : (
          <select value={studentId ?? ""} onChange={(e) => setStudentId(Number(e.target.value) || null)}>
            <option value="">{t("attendance.chooseStudent")}</option>
            {students?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.last_name} {s.first_name}
              </option>
            ))}
          </select>
        )}
      </div>

      <section className="card no-pad">
        {mode === "group" &&
          (sessions && sessions.length === 0 ? (
            <p className="empty">{t("attendance.noSessions")}</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>{t("common.date")}</th>
                  <th>{t("attendance.present")}</th>
                  <th>{t("attendance.absentees")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sessions?.map((s) => (
                  <tr key={s.date}>
                    <td className="strong">{fmt.weekday(s.date)}</td>
                    <td>
                      {s.present}/{s.present + s.absent}
                    </td>
                    <td>{s.absentees.length ? s.absentees.join(", ") : <span className="muted">{t("attendance.nobodyAbsent")}</span>}</td>
                    <td className="cell-actions">
                      <button type="button" className="btn btn-sm" onClick={() => groupId && onOpenSession(groupId, s.date)}>
                        {t("attendance.open")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}

        {mode === "student" &&
          (!studentId ? (
            <p className="empty">{t("attendance.chooseStudent")}</p>
          ) : records && records.length === 0 ? (
            <p className="empty">{t("students.noAttendance")}</p>
          ) : (
            <>
              <div className="card-header padded">
                <span className="muted">
                  {t("students.attendanceRate", {
                    rate: records?.length ? Math.round((presentCount / records.length) * 100) : 0,
                    present: presentCount,
                    total: records?.length ?? 0,
                  })}
                </span>
                <button type="button" className="link" onClick={() => openStudent(studentId)}>
                  {t("students.details")}
                </button>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("common.date")}</th>
                    <th>{t("common.group")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {records?.map((r) => (
                    <tr key={`${r.date}-${r.group_id}`}>
                      <td>{fmt.weekday(r.date)}</td>
                      <td>{r.group_name}</td>
                      <td>
                        <span className={`badge ${r.present ? "badge-paid" : "badge-late"}`}>
                          {r.present ? t("attendance.present") : t("attendance.absent")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ))}
      </section>
    </>
  );
}

export function AttendancePage() {
  const { t } = useTranslation();
  const { params } = useApp();
  const [tab, setTab] = useState<"session" | "history">("session");
  const [session, setSession] = useState<{ groupId: number | null; date: string; key: number } | null>(null);
  const { data: groups } = useLoader(() => api.listGroups(), []);

  useEffect(() => {
    if (groups && !session) {
      setSession({ groupId: params.groupId ?? rememberedGroup(groups), date: params.date ?? isoDate(new Date()), key: 0 });
    }
  }, [groups, session, params]);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{t("attendance.title")}</h1>
        </div>
        <div className="tabs tabs-inline">
          <button type="button" className={tab === "session" ? "active" : ""} onClick={() => setTab("session")}>
            <Icon name="attendance" size={16} /> {t("attendance.today")}
          </button>
          <button type="button" className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>
            <Icon name="history" size={16} /> {t("attendance.history")}
          </button>
        </div>
      </header>

      {groups && groups.length === 0 && (
        <section className="card">
          <p className="empty">{t("attendance.noGroups")}</p>
        </section>
      )}

      {groups && groups.length > 0 && session && tab === "session" && (
        <SessionView key={session.key} groups={groups} initialGroup={session.groupId} initialDate={session.date} />
      )}
      {groups && groups.length > 0 && tab === "history" && (
        <HistoryView
          groups={groups}
          onOpenSession={(groupId, date) => {
            setSession((prev) => ({ groupId, date, key: (prev?.key ?? 0) + 1 }));
            setTab("session");
          }}
        />
      )}
    </>
  );
}
