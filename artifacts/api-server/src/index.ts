import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { initSocket } from "./socket";
import { initCronJobs } from "./lib/cron";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"] || "5000";
const port = Number(rawPort);

const server = createServer(app);

// Initialize Socket.io
initSocket(server);

// Initialize Cron Jobs
initCronJobs();

// Startup database migrations
async function runStartupMigrations() {
  try {
    await pool.query("ALTER TYPE role ADD VALUE IF NOT EXISTS 'HR Manager';");
    await pool.query("ALTER TYPE leave_type ADD VALUE IF NOT EXISTS 'Work From Home';");
    await pool.query("UPDATE people SET role = 'HR Manager', title = 'Head of People & HR Operations' WHERE email = 'sanjana.jetty1469@gmail.com' OR name ILIKE '%Sanjana%';");
    await pool.query(`
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
    logger.info("Executed startup migrations: role, leave_type & content_calendar table.");
  } catch (err: any) {
    logger.warn({ err: err?.message || err }, "Startup migration warning");
  }
}
void runStartupMigrations();

process.on("uncaughtException", (err) => {
  logger.warn({ err: err?.message || err }, "Uncaught Exception caught (prevented crash)");
});

process.on("unhandledRejection", (reason: any) => {
  logger.warn({ reason: reason?.message || reason }, "Unhandled Rejection caught (prevented crash)");
});

if (Number.isNaN(port)) {
  server.listen(rawPort, () => {
    logger.info({ socket: rawPort }, "Server listening on socket");
  });
} else {
  server.listen(port, "0.0.0.0", () => {
    logger.info({ port }, "Server listening on 0.0.0.0");
  });
}
