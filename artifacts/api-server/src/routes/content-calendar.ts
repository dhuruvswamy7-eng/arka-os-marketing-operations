import { Router, type IRouter } from "express";
import { db, contentCalendarTable, peopleTable } from "@workspace/db";
import { eq, desc, and, asc } from "drizzle-orm";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-dev-secret-key-do-not-use-in-prod";

const router: IRouter = Router();

// Middleware: Strictly allow Founder and Manager roles only
async function verifyFounderOrManager(req: any, res: any, next: any): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Authorization token required" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (!decoded?.id) {
      res.status(401).json({ message: "Invalid token payload" });
      return;
    }

    // Double check with live DB for role in case role changed
    let role = decoded.role;
    try {
      const user = await db.select().from(peopleTable).where(eq(peopleTable.id, decoded.id)).limit(1).then(r => r[0]);
      if (user) {
        role = user.role;
      }
    } catch {
      // fallback to token role
    }

    if (role !== "Founder" && role !== "Manager") {
      res.status(403).json({ message: "Forbidden: Content Calendar is accessible only to Founder and Manager" });
      return;
    }

    req.actor = { id: decoded.id, role, email: decoded.email };
    next();
  } catch (err: any) {
    res.status(401).json({ message: "Authentication failed", error: err.message });
    return;
  }
}

router.use(verifyFounderOrManager);

// GET /api/content-calendar?client=...
router.get("/", async (req, res) => {
  try {
    const clientQuery = req.query.client as string | undefined;

    let items;
    if (clientQuery && clientQuery.trim()) {
      items = await db
        .select()
        .from(contentCalendarTable)
        .where(eq(contentCalendarTable.client, clientQuery.trim()))
        .orderBy(asc(contentCalendarTable.date), desc(contentCalendarTable.createdAt));
    } else {
      items = await db
        .select()
        .from(contentCalendarTable)
        .orderBy(asc(contentCalendarTable.date), desc(contentCalendarTable.createdAt));
    }

    res.json({ items });
  } catch (err: any) {
    console.error("Fetch content calendar error:", err);
    res.status(500).json({ message: "Failed to fetch content calendar", error: err.message });
  }
});

// POST /api/content-calendar
router.post("/", async (req: any, res) => {
  try {
    const payload = req.body ?? {};
    const id = payload.id ?? `cal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const actorId = req.actor?.id || "usr_founder";

    const date = payload.date || new Date().toISOString().slice(0, 10);
    // Calculate day if not provided
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const parsedDate = new Date(date);
    const day = payload.day || (!isNaN(parsedDate.getTime()) ? dayNames[parsedDate.getDay()] : "Monday");

    const validStatuses = ["Posted", "Yet to Design", "In Progress", "Ready to Post", "Review"];
    const updateStatus = validStatuses.includes(payload.updateStatus) ? payload.updateStatus : "Yet to Design";

    const validShootStatuses = ["Shoot Completed", "Shoot Pending", "No Shoot Needed"];
    const shootStatus = validShootStatuses.includes(payload.shootStatus) ? payload.shootStatus : "No Shoot Needed";

    const newItem = {
      id,
      client: (payload.client || "General").trim(),
      date,
      day,
      format: payload.format || "Reel",
      contentTheme: payload.contentTheme || "Untitled Theme",
      scriptDescription: payload.scriptDescription || "",
      updateStatus,
      references: payload.references || "",
      shootDate: payload.shootDate || null,
      shootStatus,
      driveLink: payload.driveLink || "",
      assignedTo: payload.assignedTo || null,
      createdBy: actorId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(contentCalendarTable).values(newItem);

    const saved = await db.select().from(contentCalendarTable).where(eq(contentCalendarTable.id, id)).limit(1).then(r => r[0]);
    res.status(201).json({ item: saved });
  } catch (err: any) {
    console.error("Create content calendar item error:", err);
    res.status(500).json({ message: "Failed to create content calendar item", error: err.message });
  }
});

// PATCH /api/content-calendar/:id
router.patch("/:id", async (req: any, res) => {
  try {
    const { id } = req.params;
    const payload = req.body ?? {};

    const existing = await db.select().from(contentCalendarTable).where(eq(contentCalendarTable.id, id)).limit(1).then(r => r[0]);
    if (!existing) {
      res.status(404).json({ message: "Content calendar item not found" });
      return;
    }

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (payload.client !== undefined) updates.client = payload.client.trim();
    if (payload.date !== undefined) {
      updates.date = payload.date;
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const parsed = new Date(payload.date);
      if (!isNaN(parsed.getTime())) {
        updates.day = dayNames[parsed.getDay()];
      }
    }
    if (payload.day !== undefined) updates.day = payload.day;
    if (payload.format !== undefined) updates.format = payload.format;
    if (payload.contentTheme !== undefined) updates.contentTheme = payload.contentTheme;
    if (payload.scriptDescription !== undefined) updates.scriptDescription = payload.scriptDescription;
    if (payload.updateStatus !== undefined) updates.updateStatus = payload.updateStatus;
    if (payload.references !== undefined) updates.references = payload.references;
    if (payload.shootDate !== undefined) updates.shootDate = payload.shootDate;
    if (payload.shootStatus !== undefined) updates.shootStatus = payload.shootStatus;
    if (payload.driveLink !== undefined) updates.driveLink = payload.driveLink;
    if (payload.assignedTo !== undefined) updates.assignedTo = payload.assignedTo;

    await db.update(contentCalendarTable).set(updates).where(eq(contentCalendarTable.id, id));

    const updated = await db.select().from(contentCalendarTable).where(eq(contentCalendarTable.id, id)).limit(1).then(r => r[0]);
    res.json({ item: updated });
  } catch (err: any) {
    console.error("Update content calendar item error:", err);
    res.status(500).json({ message: "Failed to update content calendar item", error: err.message });
  }
});

// DELETE /api/content-calendar/:id
router.delete("/:id", async (req: any, res) => {
  try {
    const { id } = req.params;
    await db.delete(contentCalendarTable).where(eq(contentCalendarTable.id, id));
    res.json({ success: true, id });
  } catch (err: any) {
    console.error("Delete content calendar item error:", err);
    res.status(500).json({ message: "Failed to delete content calendar item", error: err.message });
  }
});

export default router;
