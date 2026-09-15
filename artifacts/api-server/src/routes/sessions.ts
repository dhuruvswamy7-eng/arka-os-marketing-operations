import { Router, type IRouter } from "express";
import { db, sessionsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const userId = req.query.userId as string | undefined;
    const items = userId 
      ? await db.select().from(sessionsTable).where(eq(sessionsTable.userId, userId)).orderBy(desc(sessionsTable.loginAt))
      : await db.select().from(sessionsTable).orderBy(desc(sessionsTable.loginAt));

    res.json({ items });
  } catch (err) {
    console.error("Get sessions error:", err);
    res.status(503).json({ message: "Database unavailable" });
  }
});

export default router;
