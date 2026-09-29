import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const targetDbUrl = process.env.DATABASE_URL || "postgresql://arka_db_wa06_user:uKycXALvtAZopPBYXcj7AvY9wxPkyiaV@dpg-datomclg1s2s73a6s8sg-a.ohio-postgres.render.com/arka_db_wa06?sslmode=require";

const client = new pg.Client({
  connectionString: targetDbUrl,
});

async function run() {
  console.log("Connecting to target database:", targetDbUrl.replace(/:[^:@]+@/, ":****@"));
  await client.connect();
  console.log("Connected successfully! Provisioning schema...");

  // 1. Create Enums
  await client.query(`
    DO $$ BEGIN
      CREATE TYPE role AS ENUM ('Founder', 'Manager', 'Team member', 'HR Manager');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE presence AS ENUM ('Online', 'Break', 'Lunch', 'Idle', 'Offline');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE work_stage AS ENUM ('Planning', 'Assigned', 'In Progress', 'Review', 'Revision', 'Approved', 'Completed', 'Blocked');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE priority AS ENUM ('Low', 'Medium', 'High', 'Urgent');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE work_type AS ENUM ('Website', 'SEO', 'Graphic Design', 'Internal', 'Other');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE task_stage AS ENUM ('Assigned', 'In Progress', 'Review', 'Revision', 'Approved', 'Completed', 'Blocked');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE leave_status AS ENUM ('Pending', 'Approved', 'Rejected', 'Cancelled');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE leave_type AS ENUM ('Casual', 'Sick', 'Personal', 'Work From Home', 'Other');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE report_status AS ENUM ('Draft', 'Submitted', 'Reviewed', 'Needs revision');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  // Ensure Enum values exist in case of preexisting enum
  try { await client.query("ALTER TYPE role ADD VALUE IF NOT EXISTS 'HR Manager';"); } catch(e){}
  try { await client.query("ALTER TYPE leave_type ADD VALUE IF NOT EXISTS 'Work From Home';"); } catch(e){}

  // 2. Create Tables
  await client.query(`
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL DEFAULT '1234',
      role role NOT NULL,
      title TEXT NOT NULL,
      manager_id TEXT,
      presence presence NOT NULL,
      login_at TEXT,
      logout_at TEXT,
      last_active_at TEXT NOT NULL,
      session_minutes INTEGER DEFAULT 0,
      task_minutes INTEGER DEFAULT 0,
      active_session_id TEXT
    );

    ALTER TABLE people ADD COLUMN IF NOT EXISTS session_minutes INTEGER DEFAULT 0;
    ALTER TABLE people ADD COLUMN IF NOT EXISTS task_minutes INTEGER DEFAULT 0;
    ALTER TABLE people ADD COLUMN IF NOT EXISTS active_session_id TEXT;
    ALTER TABLE people ADD COLUMN IF NOT EXISTS login_at TEXT;
    ALTER TABLE people ADD COLUMN IF NOT EXISTS logout_at TEXT;

    CREATE TABLE IF NOT EXISTS work (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      client TEXT,
      work_type work_type NOT NULL,
      priority priority NOT NULL,
      due_date TEXT NOT NULL,
      founder_id TEXT NOT NULL,
      manager_id TEXT,
      direct_assignee_id TEXT,
      stage work_stage NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      work_id TEXT NOT NULL,
      title TEXT NOT NULL,
      instructions TEXT NOT NULL,
      assignee_id TEXT NOT NULL,
      due_date TEXT NOT NULL,
      priority priority NOT NULL,
      stage task_stage NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      time_minutes INTEGER NOT NULL DEFAULT 0,
      estimated_minutes INTEGER NOT NULL DEFAULT 0,
      submitted_at TEXT,
      revision_note TEXT
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      work_id TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL,
      tone TEXT DEFAULT 'normal'
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      work_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      manager_id TEXT NOT NULL,
      period TEXT NOT NULL,
      completed TEXT NOT NULL,
      in_progress TEXT NOT NULL,
      blockers TEXT NOT NULL,
      decisions TEXT NOT NULL,
      status report_status NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      recipient_id TEXT,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      url TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      task_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leaves (
      id TEXT PRIMARY KEY,
      userId TEXT,
      leaveType TEXT,
      startDate TEXT,
      endDate TEXT,
      reason TEXT,
      note TEXT,
      status TEXT,
      approvedBy TEXT,
      createdAt TEXT,
      user_id TEXT,
      leave_type leave_type,
      start_date TEXT,
      end_date TEXT,
      status_enum leave_status,
      approved_by TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      login_at TEXT NOT NULL,
      logout_at TEXT,
      duration_minutes INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS content_calendar (
      id TEXT PRIMARY KEY,
      client TEXT NOT NULL,
      date TEXT NOT NULL,
      day TEXT NOT NULL,
      format TEXT NOT NULL,
      content_theme TEXT NOT NULL,
      script_description TEXT,
      update_status TEXT NOT NULL DEFAULT 'Yet to Design',
      "references" TEXT,
      shoot_date TEXT,
      shoot_status TEXT NOT NULL DEFAULT 'No Shoot Needed',
      drive_link TEXT,
      assigned_to TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );
  `);
  console.log("All tables created successfully!");

  // 3. Restore data from backup if present
  const backupPath = path.join(__dirname, "backup-data.json");
  if (fs.existsSync(backupPath)) {
    console.log("Found backup-data.json, restoring existing data...");
    const backup = JSON.parse(fs.readFileSync(backupPath, "utf-8"));

    if (backup.people && backup.people.length > 0) {
      for (const p of backup.people) {
        await client.query(`
          INSERT INTO people (id, name, email, password, role, title, manager_id, presence, login_at, logout_at, last_active_at, session_minutes, task_minutes, active_session_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            password = EXCLUDED.password,
            role = EXCLUDED.role,
            title = EXCLUDED.title,
            manager_id = EXCLUDED.manager_id,
            presence = EXCLUDED.presence;
        `, [p.id, p.name, p.email, p.password, p.role, p.title, p.manager_id, p.presence, p.login_at, p.logout_at, p.last_active_at, p.session_minutes ?? 0, p.task_minutes ?? 0, p.active_session_id || null]);
      }
      console.log(`Restored ${backup.people.length} people.`);
    }

    if (backup.work && backup.work.length > 0) {
      for (const w of backup.work) {
        await client.query(`
          INSERT INTO work (id, title, description, client, work_type, priority, due_date, founder_id, manager_id, direct_assignee_id, stage, progress, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO NOTHING;
        `, [w.id, w.title, w.description, w.client, w.work_type, w.priority, w.due_date, w.founder_id, w.manager_id, w.direct_assignee_id, w.stage, w.progress, w.created_at]);
      }
      console.log(`Restored ${backup.work.length} work items.`);
    }

    if (backup.tasks && backup.tasks.length > 0) {
      for (const t of backup.tasks) {
        await client.query(`
          INSERT INTO tasks (id, work_id, title, instructions, assignee_id, due_date, priority, stage, progress, time_minutes, estimated_minutes, submitted_at, revision_note)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO NOTHING;
        `, [t.id, t.work_id, t.title, t.instructions, t.assignee_id, t.due_date, t.priority, t.stage, t.progress, t.time_minutes, t.estimated_minutes, t.submitted_at, t.revision_note]);
      }
      console.log(`Restored ${backup.tasks.length} tasks.`);
    }

    if (backup.activities && backup.activities.length > 0) {
      for (const a of backup.activities) {
        await client.query(`
          INSERT INTO activities (id, work_id, actor_id, message, created_at, tone)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING;
        `, [a.id, a.work_id, a.actor_id, a.message, a.created_at, a.tone]);
      }
      console.log(`Restored ${backup.activities.length} activities.`);
    }

    if (backup.sessions && backup.sessions.length > 0) {
      for (const s of backup.sessions) {
        await client.query(`
          INSERT INTO sessions (id, user_id, date, login_at, logout_at, duration_minutes)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING;
        `, [s.id, s.user_id, s.date, s.login_at, s.logout_at, s.duration_minutes]);
      }
      console.log(`Restored ${backup.sessions.length} sessions.`);
    }
  }

  console.log("Database initialized and populated successfully!");
  await client.end();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
