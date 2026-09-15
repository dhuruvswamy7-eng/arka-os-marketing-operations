import { Router, type IRouter } from "express";
import { db, activitiesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  try {
    const items = await db.select().from(activitiesTable).orderBy(desc(activitiesTable.id));
    res.json({ items });
  } catch (err) {
    res.status(503).json({ message: "Database unavailable" });
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = req.body ?? {};
    const id = payload.id ?? `activity-${Date.now()}`;
    
    await db.insert(activitiesTable).values({
      id,
      workId: payload.workId,
      actorId: payload.actorId,
      message: payload.message ?? "",
      tone: payload.tone ?? "normal",
      createdAt: payload.createdAt ?? new Date().toISOString()
    });

    const item = await db.select().from(activitiesTable).where(eq(activitiesTable.id, id)).limit(1).then(r => r[0]);
    res.status(201).json({ item });
  } catch (err) {
    console.error("Create activity error:", err);
    res.status(503).json({ message: "Database unavailable or invalid payload" });
  }
});

export default router;
