import Database from "better-sqlite3";

export type Db = Database.Database;

const MIGRATIONS: string[] = [
  `
  CREATE TABLE groups (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    level         TEXT    NOT NULL DEFAULT '',
    monthly_price INTEGER NOT NULL CHECK (monthly_price >= 0),
    created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE students (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name   TEXT    NOT NULL,
    last_name    TEXT    NOT NULL,
    parent_phone TEXT    NOT NULL DEFAULT '',
    enrolled_at  TEXT    NOT NULL DEFAULT (date('now', 'localtime')),
    is_active    INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
  );

  CREATE TABLE student_groups (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    group_id     INTEGER NOT NULL REFERENCES groups(id)   ON DELETE CASCADE,
    custom_price INTEGER CHECK (custom_price IS NULL OR custom_price >= 0),
    UNIQUE (student_id, group_id)
  );

  CREATE TABLE attendance (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    group_id   INTEGER NOT NULL REFERENCES groups(id)   ON DELETE CASCADE,
    date       TEXT    NOT NULL,
    present    INTEGER NOT NULL CHECK (present IN (0, 1)),
    UNIQUE (student_id, group_id, date)
  );

  CREATE TABLE payments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    group_id   INTEGER NOT NULL REFERENCES groups(id)   ON DELETE CASCADE,
    month      INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year       INTEGER NOT NULL,
    amount     INTEGER NOT NULL CHECK (amount >= 0),
    paid_at    TEXT,
    status     TEXT    NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'late')),
    UNIQUE (student_id, group_id, year, month)
  );

  CREATE INDEX idx_student_groups_group ON student_groups(group_id);
  CREATE INDEX idx_attendance_group_date ON attendance(group_id, date);
  CREATE INDEX idx_attendance_student ON attendance(student_id);
  CREATE INDEX idx_payments_period ON payments(year, month);
  CREATE INDEX idx_payments_student ON payments(student_id);
  `,
];

/** Ouvre (ou crée) la base et applique les migrations manquantes. */
export function openDatabase(filename: string): Db {
  const db = new Database(filename);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Db) {
  const current = db.pragma("user_version", { simple: true }) as number;
  for (let version = current; version < MIGRATIONS.length; version++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[version]);
      db.pragma(`user_version = ${version + 1}`);
    })();
  }
}
