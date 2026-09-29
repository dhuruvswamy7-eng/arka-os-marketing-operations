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
  console.log("Connecting to Render PostgreSQL database...");
  await client.connect();
  console.log("Connected successfully!");

  const dumpPath = path.join(__dirname, "full-production-dump.json");
  if (!fs.existsSync(dumpPath)) {
    throw new Error("full-production-dump.json not found!");
  }

  const dump = JSON.parse(fs.readFileSync(dumpPath, "utf-8"));

  // 1. Ensure Enums
  console.log("Checking enums...");
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

  try { await client.query("ALTER TYPE role ADD VALUE IF NOT EXISTS 'HR Manager';"); } catch(e){}
  try { await client.query("ALTER TYPE leave_type ADD VALUE IF NOT EXISTS 'Work From Home';"); } catch(e){}

  // 2. Clear out any previous dummy/test data cleanly to avoid duplicate key conflicts
  console.log("Cleaning up target tables before full import...");
  await client.query("DELETE FROM activities;");
  await client.query("DELETE FROM tasks;");
  await client.query("DELETE FROM work;");
  await client.query("DELETE FROM comments;");
  await client.query("DELETE FROM reports;");
  await client.query("DELETE FROM messages;");
  await client.query("DELETE FROM documents;");
  await client.query("DELETE FROM leaves;");
  await client.query("DELETE FROM sessions;");
  await client.query("DELETE FROM people;");

  // 3. Restore People
  if (dump.people && dump.people.length > 0) {
    console.log(`Importing ${dump.people.length} people...`);
    for (const p of dump.people) {
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
          presence = EXCLUDED.presence,
          login_at = EXCLUDED.login_at,
          logout_at = EXCLUDED.logout_at,
          last_active_at = EXCLUDED.last_active_at,
          session_minutes = EXCLUDED.session_minutes,
          task_minutes = EXCLUDED.task_minutes,
          active_session_id = EXCLUDED.active_session_id;
      `, [p.id, p.name, p.email, p.password, p.role, p.title, p.manager_id, p.presence, p.login_at, p.logout_at, p.last_active_at, p.session_minutes ?? 0, p.task_minutes ?? 0, p.active_session_id || null]);
    }
    console.log(`Successfully imported ${dump.people.length} people.`);
  }

  // 4. Restore Work
  if (dump.work && dump.work.length > 0) {
    console.log(`Importing ${dump.work.length} work items...`);
    for (const w of dump.work) {
      await client.query(`
        INSERT INTO work (id, title, description, client, work_type, priority, due_date, founder_id, manager_id, direct_assignee_id, stage, progress, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO NOTHING;
      `, [w.id, w.title, w.description, w.client, w.work_type, w.priority, w.due_date, w.founder_id, w.manager_id, w.direct_assignee_id, w.stage, w.progress ?? 0, w.created_at]);
    }
    console.log(`Successfully imported ${dump.work.length} work items.`);
  }

  // 5. Restore Tasks
  if (dump.tasks && dump.tasks.length > 0) {
    console.log(`Importing ${dump.tasks.length} tasks...`);
    for (const t of dump.tasks) {
      await client.query(`
        INSERT INTO tasks (id, work_id, title, instructions, assignee_id, due_date, priority, stage, progress, time_minutes, estimated_minutes, submitted_at, revision_note)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO NOTHING;
      `, [t.id, t.work_id, t.title, t.instructions, t.assignee_id, t.due_date, t.priority, t.stage, t.progress ?? 0, t.time_minutes ?? 0, t.estimated_minutes ?? 0, t.submitted_at || null, t.revision_note || null]);
    }
    console.log(`Successfully imported ${dump.tasks.length} tasks.`);
  }

  // 6. Restore Activities
  if (dump.activities && dump.activities.length > 0) {
    console.log(`Importing ${dump.activities.length} activities...`);
    for (const a of dump.activities) {
      await client.query(`
        INSERT INTO activities (id, work_id, actor_id, message, created_at, tone)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING;
      `, [a.id, a.work_id, a.actor_id, a.message, a.created_at, a.tone || "normal"]);
    }
    console.log(`Successfully imported ${dump.activities.length} activities.`);
  }

  // 7. Restore Messages
  if (dump.messages && dump.messages.length > 0) {
    console.log(`Importing ${dump.messages.length} messages...`);
    for (const m of dump.messages) {
      await client.query(`
        INSERT INTO messages (id, sender_id, recipient_id, content, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING;
      `, [m.id, m.sender_id, m.recipient_id || null, m.content, m.created_at]);
    }
    console.log(`Successfully imported ${dump.messages.length} messages.`);
  }

  // 8. Restore Leaves
  if (dump.leaves && dump.leaves.length > 0) {
    console.log(`Importing ${dump.leaves.length} leaves...`);
    for (const l of dump.leaves) {
      await client.query(`
        INSERT INTO leaves (id, user_id, leave_type, start_date, end_date, reason, note, status, approved_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING;
      `, [l.id, l.user_id, l.leave_type, l.start_date, l.end_date, l.reason, l.note || null, l.status, l.approved_by || null, l.created_at]);
    }
    console.log(`Successfully imported ${dump.leaves.length} leaves.`);
  }

  // 9. Restore Sessions
  if (dump.sessions && dump.sessions.length > 0) {
    console.log(`Importing ${dump.sessions.length} sessions...`);
    for (const s of dump.sessions) {
      await client.query(`
        INSERT INTO sessions (id, user_id, date, login_at, logout_at, duration_minutes)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING;
      `, [s.id, s.user_id, s.date, s.login_at, s.logout_at || null, s.duration_minutes ?? 0]);
    }
    console.log(`Successfully imported ${dump.sessions.length} sessions.`);
  }

  console.log("ALL DATA RESTORED TO RENDER POSTGRESQL SUCCESSFULLY!");
  await client.end();
}

run().catch((err) => {
  console.error("Restore failed:", err);
  process.exit(1);
});
