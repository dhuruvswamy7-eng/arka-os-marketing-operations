import { Router, type IRouter } from "express";
import { db, workTable, tasksTable, peopleTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  const query = req.query.q;
  if (typeof query !== "string" || !query.trim()) {
    res.json({ results: [] });
    return;
  }

  const searchTerm = query.trim();

  try {
    // Search Work using tsvector
    const workResults = await db.select().from(workTable).where(
      sql`to_tsvector('english', ${workTable.title} || ' ' || ${workTable.description}) @@ plainto_tsquery('english', ${searchTerm})`
    ).limit(10);

    // Search Tasks using tsvector
    const taskResults = await db.select().from(tasksTable).where(
      sql`to_tsvector('english', ${tasksTable.title} || ' ' || ${tasksTable.instructions}) @@ plainto_tsquery('english', ${searchTerm})`
    ).limit(10);

    // Search People using tsvector
    const peopleResults = await db.select().from(peopleTable).where(
      sql`to_tsvector('english', ${peopleTable.name} || ' ' || ${peopleTable.title}) @@ plainto_tsquery('english', ${searchTerm})`
    ).limit(10);

    res.json({
      results: [
        ...workResults.map(w => ({ type: "work", id: w.id, title: w.title, snippet: w.description })),
        ...taskResults.map(t => ({ type: "task", id: t.id, title: t.title, snippet: t.instructions })),
        ...peopleResults.map(p => ({ type: "person", id: p.id, title: p.name, snippet: p.title })),
      ]
    });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ message: "Search failed" });
  }
});

export default router;
