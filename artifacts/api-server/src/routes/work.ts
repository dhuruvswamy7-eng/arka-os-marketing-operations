import { Router, type IRouter } from "express";
import { db, workTable, tasksTable, activitiesTable, commentsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  try {
    const items = await db.select().from(workTable).orderBy(desc(workTable.createdAt));
    res.json({ items });
  } catch (err) {
    res.status(503).json({ message: "Database unavailable" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const item = await db.select().from(workTable).where(eq(workTable.id, req.params.id)).limit(1).then(r => r[0]);
    if (!item) {
      res.status(404).json({ message: "Work item not found" });
      return;
    }
    res.json({ item });
  } catch (err) {
    res.status(503).json({ message: "Database unavailable" });
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = req.body ?? {};
    const id = payload.id ?? `work-${Date.now()}`;
    
    const validWorkTypes = ["Website", "SEO", "Graphic Design", "Internal", "Other"];
    const workType = validWorkTypes.includes(payload.workType) ? payload.workType : "Website";
    const validPriorities = ["Low", "Medium", "High", "Urgent"];
    const priority = validPriorities.includes(payload.priority) ? payload.priority : "Medium";
    const validStages = ["Planning", "Assigned", "In Progress", "Review", "Revision", "Approved", "Completed", "Blocked"];
    const stage = validStages.includes(payload.stage) ? payload.stage : "Planning";

    await db.insert(workTable).values({
      id,
      title: payload.title ?? "New Work Item",
      description: payload.description || "Assigned work",
      client: payload.client ?? null,
      workType,
      priority,
      dueDate: payload.dueDate || new Date().toISOString().slice(0, 10),
      founderId: payload.founderId || "usr_founder",
      managerId: payload.managerId ?? null,
      directAssigneeId: payload.directAssigneeId ?? null,
      stage,
      progress: Number(payload.progress) || 0,
      createdAt: payload.createdAt || new Date().toISOString().slice(0, 10)
    });

    const item = await db.select().from(workTable).where(eq(workTable.id, id)).limit(1).then(r => r[0]);
    res.status(201).json({ item });
  } catch (err) {
    console.error("Create work error:", err);
    res.status(503).json({ message: "Database unavailable or invalid payload" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const workId = req.params.id;
    await db.delete(tasksTable).where(eq(tasksTable.workId, workId));
    await db.delete(activitiesTable).where(eq(activitiesTable.workId, workId));
    await db.delete(commentsTable).where(eq(commentsTable.workId, workId));
    await db.delete(workTable).where(eq(workTable.id, workId));
    res.status(204).end();
  } catch (err) {
    console.error("Delete work error:", err);
    res.status(503).json({ message: "Database unavailable" });
  }
});

export default router;
