import fs from "node:fs";
import path from "node:path";
// @ts-ignore
import initSqlJs from "sql.js";

const dbDir = path.resolve(process.cwd(), "data");
const dbPath = path.join(dbDir, "arka-os.sqlite");
const distDir = path.resolve(process.cwd(), "dist");

let dbPromise: Promise<any> | null = null;

export async function getSqlDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      fs.mkdirSync(dbDir, { recursive: true });
      const SQL = await initSqlJs({
        locateFile: (filename: string) => path.join(distDir, filename),
      });
      const fileExists = fs.existsSync(dbPath);
      const db = new SQL.Database(fileExists ? fs.readFileSync(dbPath) : undefined);

      if (!fileExists) {
        db.run(`
          CREATE TABLE people (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL DEFAULT '1234',
            role TEXT NOT NULL,
            title TEXT NOT NULL,
            manager_id TEXT,
            presence TEXT NOT NULL,
            login_at TEXT,
            logout_at TEXT,
            last_active_at TEXT NOT NULL,
            session_minutes INTEGER DEFAULT 0,
            task_minutes INTEGER DEFAULT 0
          );

          CREATE TABLE work (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            client TEXT,
            work_type TEXT NOT NULL,
            priority TEXT NOT NULL,
            due_date TEXT NOT NULL,
            founder_id TEXT NOT NULL,
            manager_id TEXT,
            direct_assignee_id TEXT,
            stage TEXT NOT NULL,
            progress INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
          );

          CREATE TABLE tasks (
            id TEXT PRIMARY KEY,
            work_id TEXT NOT NULL,
            title TEXT NOT NULL,
            instructions TEXT NOT NULL,
            assignee_id TEXT NOT NULL,
            due_date TEXT NOT NULL,
            priority TEXT NOT NULL,
            stage TEXT NOT NULL,
            progress INTEGER NOT NULL DEFAULT 0,
            time_minutes INTEGER NOT NULL DEFAULT 0,
            estimated_minutes INTEGER NOT NULL DEFAULT 0,
            submitted_at TEXT,
            revision_note TEXT
          );
        `);

        db.run(`
          INSERT INTO people(id, name, email, password, role, title, manager_id, presence, login_at, logout_at, last_active_at, session_minutes, task_minutes)
          VALUES
            ('usr_founder', 'Arka Founder', 'admin@arka.com', 'admin1234', 'Founder', 'Founder / CEO', NULL, 'Offline', NULL, NULL, 'Never', 0, 0);
        `);

        fs.writeFileSync(dbPath, Buffer.from(db.export()));
      }

      return db;
    })();
  }

  return dbPromise;
}

export async function saveSqlDb(db: any) {
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}
