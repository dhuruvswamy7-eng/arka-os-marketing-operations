import { Router, type IRouter } from "express";
import { db, breakLogsTable } from "@workspace/db";
import { desc, eq, and } from "drizzle-orm";

const router: IRouter = Router();

// GET /api/break-logs?date=YYYY-MM-DD&userId=...
router.get("/", async (req, res) => {
  try {
    const { date, userId } = req.query;

    if (date && userId) {
      const items = await db
        .select()
        .from(breakLogsTable)
        .where(and(eq(breakLogsTable.date, String(date)), eq(breakLogsTable.userId, String(userId))))
        .orderBy(desc(breakLogsTable.startAt));
      return res.json({ items });
    }

    if (date) {
      const items = await db
        .select()
        .from(breakLogsTable)
        .where(eq(breakLogsTable.date, String(date)))
        .orderBy(desc(breakLogsTable.startAt));
      return res.json({ items });
    }

    if (userId) {
      const items = await db
        .select()
        .from(breakLogsTable)
        .where(eq(breakLogsTable.userId, String(userId)))
        .orderBy(desc(breakLogsTable.startAt));
      return res.json({ items });
    }

    const items = await db.select().from(breakLogsTable).orderBy(desc(breakLogsTable.startAt)).limit(500);
    res.json({ items });
  } catch (err) {
    console.error("Get break logs error:", err);
    res.status(503).json({ message: "Database unavailable" });
  }
});

// POST /api/break-logs
router.post("/", async (req, res) => {
  try {
    const { id, userId, date, type, startAt, endAt, durationMinutes } = req.body;
    const finalId = id || `brk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    if (id) {
      const existing = await db.select().from(breakLogsTable).where(eq(breakLogsTable.id, id));
      if (existing.length > 0) {
        const [updated] = await db
          .update(breakLogsTable)
          .set({
            endAt: endAt || null,
            durationMinutes: durationMinutes ?? 0,
          })
          .where(eq(breakLogsTable.id, id))
          .returning();
        return res.json({ item: updated });
      }
    }

    const [inserted] = await db
      .insert(breakLogsTable)
      .values({
        id: finalId,
        userId,
        date: date || new Date().toISOString().slice(0, 10),
        type: type || "Break",
        startAt: startAt || new Date().toISOString(),
        endAt: endAt || null,
        durationMinutes: durationMinutes ?? 0,
      })
      .returning();

    res.status(201).json({ item: inserted });
  } catch (err) {
    console.error("Create/update break log error:", err);
    res.status(500).json({ message: "Failed to record break log" });
  }
});

// PATCH /api/break-logs/:id
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { endAt, durationMinutes } = req.body;

    const [updated] = await db
      .update(breakLogsTable)
      .set({
        endAt: endAt || null,
        durationMinutes: durationMinutes ?? 0,
      })
      .where(eq(breakLogsTable.id, id))
      .returning();

    res.json({ item: updated });
  } catch (err) {
    console.error("Patch break log error:", err);
    res.status(500).json({ message: "Failed to update break log" });
  }
});

export default router;
