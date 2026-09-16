import cron from "node-cron";
import { logger } from "./logger";
import { sendEmail } from "./mail";
import { db, peopleTable, tasksTable, sessionsTable } from "@workspace/db";
import { eq, and, or, ne, desc, sql } from "drizzle-orm";
import { getIO } from "../socket";

export function initCronJobs() {
  logger.info("Initializing background cron jobs...");

  // Auto-expire Break (>15 mins) and Lunch (>60 mins) back to Online
  // AND Auto-logout inactive users (closed browser / no heartbeat for > 2.5 mins)
  cron.schedule("* * * * *", async () => {
    try {
      const now = Date.now();

      // 1. Break / Lunch expiry
      const breakOrLunchUsers = await db
        .select()
        .from(peopleTable)
        .where(
          or(
            eq(peopleTable.presence, "Break"),
            eq(peopleTable.presence, "Lunch")
          )
        );

      for (const u of breakOrLunchUsers) {
        if (!u.lastActiveAt) continue;
        const last = new Date(u.lastActiveAt).getTime();
        if (isNaN(last)) continue;
        const diffMinutes = (now - last) / (1000 * 60);

        if ((u.presence === "Break" && diffMinutes >= 15) || (u.presence === "Lunch" && diffMinutes >= 60)) {
          logger.info(`Auto-reverting user ${u.name} (${u.id}) from ${u.presence} to Online (expired: ${Math.round(diffMinutes)}m)`);
          await db
            .update(peopleTable)
            .set({ presence: "Online", lastActiveAt: new Date().toISOString() })
            .where(eq(peopleTable.id, u.id));

          try {
            const io = getIO();
            io.emit("presence:update", { userId: u.id, status: "Online" });
          } catch {}
        }
      }

      // 2. Inactive user auto-logout watchdog (no activity/heartbeat > 2.5 mins)
      const nonOfflineUsers = await db
        .select()
        .from(peopleTable)
        .where(ne(peopleTable.presence, "Offline"));

      for (const u of nonOfflineUsers) {
        if (!u.lastActiveAt) continue;
        const last = new Date(u.lastActiveAt).getTime();
        if (isNaN(last)) continue;
        const diffMinutes = (now - last) / (1000 * 60);

        if (diffMinutes >= 2.5) {
          logger.info(`Auto-logging out inactive user ${u.name} (${u.id}) - inactive for ${Math.round(diffMinutes)}m`);
          const logoutIso = u.lastActiveAt;

          await db
            .update(peopleTable)
            .set({ 
              presence: "Offline", 
              logoutAt: logoutIso,
              activeSessionId: null 
            })
            .where(eq(peopleTable.id, u.id));

          // Close open session in sessionsTable
          const openSessions = await db
            .select()
            .from(sessionsTable)
            .where(eq(sessionsTable.userId, u.id))
            .orderBy(desc(sessionsTable.loginAt));

          for (const ses of openSessions) {
            if (!ses.logoutAt) {
              const duration = Math.max(1, Math.round((new Date(logoutIso).getTime() - new Date(ses.loginAt).getTime()) / 60000));
              await db
                .update(sessionsTable)
                .set({ logoutAt: logoutIso, durationMinutes: duration })
                .where(eq(sessionsTable.id, ses.id));
            }
          }

          try {
            const io = getIO();
            io.emit("presence:update", { userId: u.id, status: "Offline" });
          } catch {}
        }
      }
    } catch (err) {
      logger.error(err, "Error in background watchdog cron job");
    }
  });

  // Example: Daily Status Ping at 9:00 AM
  cron.schedule("0 9 * * *", async () => {
    logger.info("Running daily status ping...");
    try {
      const activeUsers = await db.select().from(peopleTable).where(eq(peopleTable.presence, "Online"));
      
      if (process.env.SMTP_USER && activeUsers.length > 0) {
        const founder = await db.select().from(peopleTable).where(eq(peopleTable.role, "Founder")).limit(1).then(res => res[0]);
        if (founder) {
          await sendEmail({
            to: founder.email,
            subject: "Daily Team Status Update",
            html: `<h3>Daily Status Update</h3><p>There are currently ${activeUsers.length} users online.</p>`
          });
        }
      }
    } catch (err) {
      logger.error(err, "Error in daily status ping cron job");
    }
  });

  // Example: Weekly Digest every Friday at 5:00 PM
  cron.schedule("0 17 * * 5", async () => {
    logger.info("Running weekly digest...");
    try {
      const completedTasks = await db.select().from(tasksTable).where(
        and(
          eq(tasksTable.stage, "Completed"),
          sql`${tasksTable.submittedAt} IS NOT NULL`
        )
      );

      if (process.env.SMTP_USER) {
        const founder = await db.select().from(peopleTable).where(eq(peopleTable.role, "Founder")).limit(1).then(res => res[0]);
        if (founder) {
          await sendEmail({
            to: founder.email,
            subject: "Weekly Task Completion Digest",
            html: `<h3>Weekly Digest</h3><p>The team completed ${completedTasks.length} tasks this week!</p>`
          });
        }
      }
    } catch (err) {
      logger.error(err, "Error in weekly digest cron job");
    }
  });
}
