import { Router, type IRouter } from "express";
import { db, commentsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  try {
    const items = await db.select().from(commentsTable).orderBy(desc(commentsTable.id));
    res.json({ items });
  } catch (err) {
    res.status(503).json({ message: "Database unavailable" });
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = req.body ?? {};
    const id = payload.id ?? `comment-${Date.now()}`;
    
    await db.insert(commentsTable).values({
      id,
      workId: payload.workId,
      authorId: payload.authorId,
      message: payload.message ?? "",
      createdAt: payload.createdAt ?? new Date().toISOString()
    });

    const item = await db.select().from(commentsTable).where(eq(commentsTable.id, id)).limit(1).then(r => r[0]);
    res.status(201).json({ item });
  } catch (err) {
    console.error("Create comment error:", err);
    res.status(503).json({ message: "Database unavailable or invalid payload" });
  }
});

export default router;
