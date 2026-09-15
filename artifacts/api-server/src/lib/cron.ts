import cron from "node-cron";
import { logger } from "./logger";
import { sendEmail } from "./mail";
import { db, peopleTable, tasksTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

export function initCronJobs() {
  logger.info("Initializing background cron jobs...");

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
      logger.error("Error in daily status ping cron job", err);
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
      logger.error("Error in weekly digest cron job", err);
    }
  });
}
