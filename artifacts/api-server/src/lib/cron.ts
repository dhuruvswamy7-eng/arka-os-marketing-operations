import cron from "node-cron";
import { logger } from "./logger";
import { sendEmail } from "./mail";
import { db, peopleTable, tasksTable } from "@workspace/db";
import { eq, and, or, sql } from "drizzle-orm";
import { getIO } from "../socket";

export function initCronJobs() {
  logger.info("Initializing background cron jobs...");

  // Auto-expire Break (>15 mins) and Lunch (>60 mins) back to Online
  cron.schedule("* * * * *", async () => {
    try {
      const breakOrLunchUsers = await db
        .select()
        .from(peopleTable)
        .where(
          or(
            eq(peopleTable.presence, "Break"),
            eq(peopleTable.presence, "Lunch")
          )
        );

      const now = Date.now();
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
    } catch (err) {
      logger.error(err, "Error in break/lunch expiry cron job");
    }
  });

  // Example: Daily Status Ping at 9:00 AM
  cron.schedule("0 9 * * *", async () => {
    logger.info("Running daily status ping...");
    try {
      const activeUsers = await db.select().from(peopleTable).where(eq(peopleTable.presence, "Online"));
      
      // We could send a summary email to the Founder
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
          // Mock checking if it was completed this week using sql
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
