import { Router, type IRouter } from "express";
import { db, tasksTable, peopleTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-dev-secret-key-do-not-use-in-prod";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    let userRole = null;
    let userId = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded?.id) {
          userId = decoded.id;
          const user = await db.select().from(peopleTable).where(eq(peopleTable.id, decoded.id)).limit(1).then(r => r[0]);
          if (user) {
            userRole = user.role;
          }
        }
      } catch {}
    }

    let items;
    if (userRole === "Team member" && userId) {
      items = await db.select().from(tasksTable).where(eq(tasksTable.assigneeId, userId));
    } else {
      items = await db.select().from(tasksTable);
    }

    res.json({ items });
  } catch (err) {
    res.status(503).json({ message: "Database unavailable" });
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = req.body ?? {};
    const id = payload.id ?? `task-${Date.now()}`;
    
    const validPriorities = ["Low", "Medium", "High", "Urgent"];
    const priority = validPriorities.includes(payload.priority) ? payload.priority : "Medium";
    const validStages = ["Assigned", "In Progress", "Review", "Revision", "Approved", "Completed", "Blocked"];
    const stage = validStages.includes(payload.stage) ? payload.stage : "Assigned";
    const dueDate = (payload.dueDate ?? new Date().toISOString()).slice(0, 10);

    await db.insert(tasksTable).values({
      id,
      workId: payload.workId,
      title: payload.title ?? "New Task",
      instructions: payload.instructions ?? "",
      assigneeId: payload.assigneeId,
      dueDate,
      priority,
      stage,
      progress: Number(payload.progress) || 0,
      timeMinutes: Number(payload.timeMinutes) || 0,
      estimatedMinutes: Number(payload.estimatedMinutes) || 60
    });

    const item = await db.select().from(tasksTable).where(eq(tasksTable.id, id)).limit(1).then(r => r[0]);
    res.status(201).json({ item });
  } catch (err) {
    console.error("Create task error:", err);
    res.status(503).json({ message: "Database unavailable or invalid payload" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const payload = req.body ?? {};
    const { id, ...updates } = payload;
    
    // Convert undefined to delete so drizzle only updates provided fields
    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

    if (Object.keys(updates).length > 0) {
      await db.update(tasksTable).set(updates).where(eq(tasksTable.id, req.params.id));
    }
    
    const item = await db.select().from(tasksTable).where(eq(tasksTable.id, req.params.id)).limit(1).then(r => r[0]);
    if (!item) {
      res.status(404).json({ message: "Task not found" });
      return;
    }
    res.json({ item });
  } catch (err) {
    console.error("Update task error:", err);
    res.status(503).json({ message: "Database unavailable or invalid payload" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(tasksTable).where(eq(tasksTable.id, req.params.id));
    res.status(204).end();
  } catch (err) {
    res.status(503).json({ message: "Database unavailable" });
  }
});

export default router;
